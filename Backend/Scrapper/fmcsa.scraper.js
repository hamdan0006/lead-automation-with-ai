const puppeteer = require('puppeteer');
const { prisma } = require('../config/db');
const logger = require('../utils/logger');
const { getRandomInt } = require('../config/scraper.rules');
const { loadProxies, ProxyRotator, PROXY_ROTATION_RULES } = require('../config/fmca.scraper.rules');
const { sendNotificationEmail } = require('../Services/mail.service');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// SAFER carrier snapshot URL — GET request, no form POST needed
const SAFER_URL = (mcNumber) =>
  `https://safer.fmcsa.dot.gov/query.asp?searchtype=ANY&query_type=queryCarrierSnapshot&query_param=MC_MX&query_string=${mcNumber}`;

/**
 * Extract carrier data from a SAFER HTML page.
 *
 * FMCSA SAFER is a ~2003 government site with complex nested tables.
 * Strategy:
 *   1. Company name  → parsed from <title> "SAFER Web - Company Snapshot NAME"
 *   2. Other fields  → text-line scan for "Label: Value" patterns
 *   3. Phone fallback → regex on the full body text
 */
const extractCarrierData = async (page) => {
  return page.evaluate(() => {
    const bodyText = document.body ? document.body.innerText : '';
    const lower    = bodyText.toLowerCase();

    // ── Blocked / error detection ──────────────────────────────────────────
    if (
      lower.includes('access denied') ||
      lower.includes('your request has been blocked') ||
      lower.includes('403 forbidden') ||
      lower.includes('please verify you are a human')
    ) {
      return { _blocked: true, _snippet: bodyText.substring(0, 300) };
    }

    // ── No-record / inactive detection ────────────────────────────────────
    if (
      lower.includes('no records found') ||
      lower.includes('0 records found') ||
      lower.includes('record not found') ||
      lower.includes('no carrier') ||
      lower.includes('usdot not found') ||
      lower.includes('is inactive') ||
      lower.includes('record inactive') ||
      lower.includes('inactive in the safer')
    ) {
      return { _notFound: true };
    }

    const title   = document.title || '';
    const snippet = bodyText.substring(0, 500);

    // ── 1. Company name from page title ───────────────────────────────────
    // Title format: "SAFER Web - Company Snapshot ROBCO ENTERPRISES"
    let legalName = null;
    const titleMatch = title.match(/Company Snapshot\s+(.+)$/i);
    if (titleMatch) legalName = titleMatch[1].trim();

    // ── 2. Text-line field scanner ────────────────────────────────────────
    // Handles both "Label: Value" (same line) and "Label\nValue" (next line).
    const lines = bodyText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    const findField = (...labels) => {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        for (const lbl of labels) {
          // Same-line format: "Physical Address: 123 MAIN ST, DALLAS, TX"
          const m = line.match(new RegExp(`^${lbl}\\s*[:\\-]\\s*(.+)$`, 'i'));
          if (m) return m[1].trim();

          // Next-line format: "Physical Address\n123 MAIN ST"
          if (line.toLowerCase().trim() === lbl.toLowerCase() && lines[i + 1]) {
            const next = lines[i + 1];
            // Skip if the next line looks like another label
            if (!/^\s*(Entity|Legal|DBA|Physical|Mailing|Phone|Operating|Power|Driver|MC\/|Carrier|Operation)/i.test(next)) {
              return next.trim();
            }
          }
        }
      }
      return null;
    };

    // ── 3. Phone fallback — only match a number appearing right after a Phone/Tel label ──
    // Searching the full body with a bare regex picks up USDOT, MC, and other numeric IDs.
    const phoneContextMatch = bodyText.match(
      /(?:Phone|Tel(?:ephone)?)\s*[:\-]?\s*(\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4})/i
    );

    return {
      usdotNumber:      findField('USDOT Number', 'US DOT Number', 'USDOT'),
      legalName:        legalName || findField('Legal Name'),
      dbaName:          findField('DBA Name', 'DBA'),
      phone:            findField('Phone', 'Telephone') || (phoneContextMatch ? phoneContextMatch[1].trim() : null),
      address:          findField('Physical Address', 'Address'),
      mcNumber:         findField('MC\\/MX\\/FF Number\\(s\\)', 'MC Number', 'MC\\/MX Number'),
      entityType:       findField('Entity Type'),
      operatingStatus:  findField('Operating Status', 'USDOT Status'),
      driverCount:      findField('Drivers', 'CDL Drivers', 'Drivers \\(CDL\\)'),
      powerUnits:       findField('Power Units'),
      carrierOperation: findField('Carrier Operation'),
      operationClass:   findField('Operation Classification', 'Operation Class'),
      _title:           title,
      _snippet:         snippet,
    };
  });
};

/**
 * Clean up the extracted fields — parse numbers, strip junk values.
 */
const parseCarrierFields = (raw) => {
  const clean  = (v) => (v && v !== 'N/A' && v !== 'None' && v !== '-' ? v : null);
  const parseNum = (v) => v ? (parseInt(String(v).replace(/[^0-9]/g, '')) || null) : null;

  return {
    usdotNumber:      parseNum(raw.usdotNumber),
    legalName:        clean(raw.legalName),
    dbaName:          clean(raw.dbaName),
    phone:            clean(raw.phone),
    address:          clean(raw.address),
    mcNumber:         clean(raw.mcNumber),
    entityType:       clean(raw.entityType),
    operatingStatus:  clean(raw.operatingStatus),
    driverCount:      parseNum(raw.driverCount),
    powerUnits:       parseNum(raw.powerUnits),
    carrierOperation: clean(raw.carrierOperation),
    operationClass:   clean(raw.operationClass),
  };
};

/**
 * Best-effort US address splitter.
 * Handles "123 MAIN ST, DALLAS, TX 75201" and similar formats.
 */
const splitAddress = (address) => {
  if (!address) return { city: null, state: null, zip: null };
  const parts = address.split(',').map((s) => s.trim());
  if (parts.length < 2) return { city: null, state: null, zip: null };
  const stateZip = (parts[parts.length - 1] || '').split(/\s+/).filter(Boolean);
  return {
    city:  parts[parts.length - 2] || null,
    state: stateZip[0] || null,
    zip:   stateZip[1] || null,
  };
};

/**
 * Launch a Puppeteer browser pointed at a specific proxy.
 * Returns { browser, page } ready for authenticated requests.
 */
const launchBrowserWithProxy = async (proxy) => {
  const args = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-blink-features=AutomationControlled',
  ];

  if (proxy) {
    args.push(`--proxy-server=http://${proxy.host}:${proxy.port}`);
  }

  const browser = await puppeteer.launch({ headless: true, args });
  const page    = await browser.newPage();

  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );

  if (proxy) {
    await page.authenticate({ username: proxy.username, password: proxy.password });
  }

  return { browser, page };
};

/**
 * Main FMCSA SAFER scraper.
 *
 * Iterates USDOT numbers fromDot → toDot, visits each carrier snapshot page,
 * and saves the carrier data into the trucking_leads table.
 *
 * Proxies: set FMCSA_PROXY_URL1…FMCSA_PROXY_URL5 in .env (format: host:port:user:pass).
 * Rotation rules are defined in config/fmca.scraper.rules.js.
 */
const runFmcsaScraper = async (fromDot, toDot, jobId) => {
  const proxies = loadProxies();
  const rotator = proxies.length > 0 ? new ProxyRotator(proxies) : null;

  if (rotator) {
    logger.info(`🔒 FMCSA proxy pool: ${proxies.length} proxies loaded. Rotating every ${PROXY_ROTATION_RULES.rotateAfter.min}–${PROXY_ROTATION_RULES.rotateAfter.max} requests.`);
  } else {
    logger.warn('⚠️  No FMCSA_PROXY_URL1–5 found in .env — requests will come from server IP.');
  }

  let browser = null;
  let page    = null;

  const initBrowser = async () => {
    if (browser) await browser.close().catch(() => {});
    const proxy = rotator ? rotator.current : null;
    if (proxy) {
      logger.info(`🔄 Browser (re)started with proxy ${rotator.index + 1}/${rotator.total}: ${proxy.host}:${proxy.port}`);
    }
    ({ browser, page } = await launchBrowserWithProxy(proxy));
  };

  try {
    logger.info(`🚛 FMCSA scraper starting: MC ${fromDot} → ${toDot} (Job #${jobId})`);
    await initBrowser();

    let leadsFound   = 0;
    let fatalBlocks  = 0;

    for (let dot = fromDot; dot <= toDot; dot++) {
      if (jobId) {
        await prisma.truckingJob.update({
          where: { id: jobId },
          data:  { currentDot: dot },
        }).catch(() => {});
      }

      try {
        await page.goto(SAFER_URL(dot), { waitUntil: 'domcontentloaded', timeout: 30000 });

        const raw = await extractCarrierData(page);

        // ── Blocked ───────────────────────────────────────────────────────
        if (raw._blocked) {
          logger.error(`🚫 MC #${dot}: blocked. Snippet: ${raw._snippet}`);

          if (rotator) {
            rotator.onBlock();
            if (rotator.rotated) {
              const backoff = getRandomInt(
                PROXY_ROTATION_RULES.blockBackoff.min,
                PROXY_ROTATION_RULES.blockBackoff.max
              );
              logger.info(`🔄 Rotating proxy after block — waiting ${backoff}ms…`);
              await sleep(backoff);
              await initBrowser();
            }
            fatalBlocks = 0;
          } else {
            fatalBlocks++;
            if (fatalBlocks >= 3) {
              logger.error('❌ Blocked 3× with no proxy configured — stopping job.');
              break;
            }
          }
          continue;
        }

        // ── No record ─────────────────────────────────────────────────────
        if (raw._notFound) {
          logger.info(`⏭  MC #${dot}: no carrier record.`);
          if (rotator) rotator.tick();
          await sleep(getRandomInt(400, 900));
          continue;
        }

        // ── Debug: first 3 MCs ────────────────────────────────────────────
        if (dot - fromDot < 3) {
          logger.info(`🔎 MC #${dot} title: "${raw._title}"`);
          logger.info(`🔎 MC #${dot} snippet: ${raw._snippet}`);
        }

        const fields = parseCarrierFields(raw);

        if (!fields.legalName) {
          logger.warn(`⏭  MC #${dot}: no Legal Name. Title="${raw._title}" Snippet="${(raw._snippet || '').substring(0, 150)}"`);
          if (rotator) rotator.tick();
          await sleep(getRandomInt(400, 900));
          continue;
        }

        if (!fields.usdotNumber) {
          logger.warn(`⏭  MC #${dot}: no USDOT Number — skipping.`);
          if (rotator) rotator.tick();
          await sleep(getRandomInt(400, 900));
          continue;
        }

        // ── Trucking-only filter ──────────────────────────────────────────────
        // Skip brokers, freight forwarders, and passenger carriers.
        // FMCSA entityType for pure brokers/FFs does not include "CARRIER".
        const entityType      = (fields.entityType      || '').toUpperCase();
        const operationClass  = (fields.operationClass  || '').toUpperCase();
        const carrierOperation= (fields.carrierOperation|| '').toUpperCase();

        const isBrokerOrFF = !entityType.includes('CARRIER') && (
          entityType.includes('BROKER') || entityType.includes('FREIGHT FORWARDER')
        );
        // Passenger carriers (school bus, charter, etc.) — skip unless they also haul property
        const isPassengerOnly = operationClass.includes('PASSENGER') && !operationClass.includes('PROPERTY');

        if (isBrokerOrFF || isPassengerOnly) {
          logger.info(`⏭  MC #${dot}: skipped — not a trucking company (entity: "${fields.entityType}", class: "${fields.operationClass}")`);
          if (rotator) rotator.tick();
          await sleep(getRandomInt(400, 900));
          continue;
        }

        if (!fields.mcNumber) fields.mcNumber = `MC-${dot}`;

        const { city, state, zip } = splitAddress(fields.address);

        await prisma.truckingLead.upsert({
          where:  { usdotNumber: fields.usdotNumber },
          create: { ...fields, city, state, zip, country: 'US', truckingJobId: jobId || null },
          update: { ...fields, city, state, zip, country: 'US' },
        });

        leadsFound++;
        if (jobId) {
          await prisma.truckingJob.update({
            where: { id: jobId },
            data:  { results: { increment: 1 } },
          }).catch(() => {});
        }

        logger.info(`✅ MC #${dot}: "${fields.legalName}" | ${fields.phone || 'no phone'} | ${fields.operatingStatus || '?'} (total: ${leadsFound})`);

        // ── Tick rotator; restart browser if rotation triggered ────────────
        if (rotator) {
          rotator.onSuccess();
          rotator.tick();
          if (rotator.rotated) await initBrowser();
        }

      } catch (dotErr) {
        logger.warn(`⚠️  MC #${dot} request error: ${dotErr.message}`);
      }

      await sleep(getRandomInt(1500, 3000));
    }

    // Mark job complete
    if (jobId) {
      await prisma.truckingJob.update({
        where: { id: jobId },
        data:  { status: 'COMPLETED', currentDot: toDot },
      }).catch(() => {});

      try {
        await sendNotificationEmail(
          `Trucking Scrape Job #${jobId} Finished`,
          `MC Range: ${fromDot}–${toDot}\nCarriers Saved: ${leadsFound}`
        );
      } catch (_) {}
    }

    logger.info(`🏁 FMCSA scrape complete — ${leadsFound} carriers saved (MC ${fromDot}–${toDot})`);

  } catch (fatalErr) {
    logger.error(`❌ FMCSA fatal error: ${fatalErr.message}`);
    if (jobId) {
      await prisma.truckingJob.update({
        where: { id: jobId },
        data:  { status: 'FAILED' },
      }).catch(() => {});
    }
    throw fatalErr;
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
};

module.exports = { runFmcsaScraper };

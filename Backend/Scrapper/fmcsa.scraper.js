const puppeteer = require('puppeteer');
const { prisma } = require('../config/db');
const logger = require('../utils/logger');
const { getRandomInt } = require('../config/scraper.rules');
const { sendNotificationEmail } = require('../Services/mail.service');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// SAFER carrier snapshot URL — GET request, no form POST needed
const SAFER_URL = (dotNumber) =>
  `https://safer.fmcsa.dot.gov/query.asp?searchtype=ANY&query_type=queryCarrierSnapshot&query_param=USDOT&query_string=${dotNumber}`;

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

    // ── 3. Phone fallback via regex ───────────────────────────────────────
    const phoneRegex = /\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4}/;
    const phoneMatch = bodyText.match(phoneRegex);

    return {
      legalName:        legalName || findField('Legal Name'),
      dbaName:          findField('DBA Name', 'DBA'),
      phone:            findField('Phone', 'Telephone') || (phoneMatch ? phoneMatch[0] : null),
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
 * Main FMCSA SAFER scraper.
 *
 * Iterates USDOT numbers fromDot → toDot, visits each carrier snapshot page,
 * and saves the carrier data into the trucking_leads table.
 *
 * ⚠️  PROXY REQUIRED FROM NON-US IPs:
 *   Set FMCSA_PROXY_URL=http://user:pass@us-proxy-host:port in .env
 */
const runFmcsaScraper = async (fromDot, toDot, jobId) => {
  let browser = null;

  const proxyUrl = process.env.FMCSA_PROXY_URL;
  const args = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-blink-features=AutomationControlled',
  ];

  if (proxyUrl) {
    // Extract host:port only (strip credentials) for the Chrome flag
    const hostPort = proxyUrl.replace(/^https?:\/\//, '').replace(/^[^@]+@/, '');
    args.push(`--proxy-server=http://${hostPort}`);
    logger.info(`🔒 FMCSA proxy active: ${hostPort}`);
  } else {
    logger.warn('⚠️  FMCSA_PROXY_URL not set — requests will come from server IP. Set a US proxy if blocked.');
  }

  try {
    logger.info(`🚛 FMCSA scraper starting: DOT ${fromDot} → ${toDot} (Job #${jobId})`);

    browser = await puppeteer.launch({ headless: true, args });
    const page = await browser.newPage();

    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Authenticate proxy if credentials are embedded in the URL
    if (proxyUrl && proxyUrl.includes('@')) {
      const m = proxyUrl.match(/\/\/([^:@]+):([^@]+)@/);
      if (m) await page.authenticate({ username: m[1], password: m[2] });
    }

    let leadsFound  = 0;
    let blockedCount = 0;

    for (let dot = fromDot; dot <= toDot; dot++) {
      // Update live progress counter in DB
      if (jobId) {
        await prisma.truckingJob.update({
          where: { id: jobId },
          data: { currentDot: dot },
        }).catch(() => {});
      }

      try {
        await page.goto(SAFER_URL(dot), { waitUntil: 'domcontentloaded', timeout: 30000 });

        const raw = await extractCarrierData(page);

        // ── Blocked page ─────────────────────────────────────────────────
        if (raw._blocked) {
          blockedCount++;
          logger.error(`🚫 USDOT #${dot}: IP BLOCKED by FMCSA. Set FMCSA_PROXY_URL in .env. Snippet: ${raw._snippet}`);
          if (blockedCount >= 3) {
            logger.error('❌ Blocked 3 times in a row — stopping job. Configure a US proxy.');
            break;
          }
          continue;
        }

        // ── No carrier at this DOT number ────────────────────────────────
        if (raw._notFound) {
          logger.info(`⏭  USDOT #${dot}: no carrier record.`);
          await sleep(getRandomInt(400, 900));
          continue;
        }

        // ── Debug: show what we got for first 3 DOTs ────────────────────
        if (dot - fromDot < 3) {
          logger.info(`🔎 USDOT #${dot} page title: "${raw._title}"`);
          logger.info(`🔎 USDOT #${dot} body snippet: ${raw._snippet}`);
          logger.info(`🔎 USDOT #${dot} raw keys: ${Object.keys(raw).filter(k => !k.startsWith('_')).join(', ')}`);
        }

        const fields = parseCarrierFields(raw);

        if (!fields.legalName) {
          logger.warn(`⏭  USDOT #${dot}: page loaded but no "Legal Name" found. Title="${raw._title}" Keys="${Object.keys(raw).join(',')}" Snippet="${(raw._snippet || '').substring(0, 150)}"`);
          await sleep(getRandomInt(400, 900));
          continue;
        }

        const { city, state, zip } = splitAddress(fields.address);

        await prisma.truckingLead.upsert({
          where:  { usdotNumber: dot },
          create: { usdotNumber: dot, ...fields, city, state, zip, country: 'US', truckingJobId: jobId || null },
          update: { ...fields, city, state, zip, country: 'US' },
        });

        leadsFound++;
        if (jobId) {
          await prisma.truckingJob.update({
            where: { id: jobId },
            data:  { results: { increment: 1 } },
          }).catch(() => {});
        }

        logger.info(`✅ USDOT #${dot}: saved "${fields.legalName}" | ${fields.phone || 'no phone'} | ${fields.operatingStatus || '?'} (total: ${leadsFound})`);

      } catch (dotErr) {
        logger.warn(`⚠️  USDOT #${dot} request error: ${dotErr.message}`);
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
          `DOT Range: ${fromDot}–${toDot}\nCarriers Saved: ${leadsFound}`
        );
      } catch (_) {}
    }

    logger.info(`🏁 FMCSA scrape complete — ${leadsFound} carriers saved (DOT ${fromDot}–${toDot})`);

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

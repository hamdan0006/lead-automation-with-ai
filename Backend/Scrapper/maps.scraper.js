const { getBrowser, launchProxyBrowser } = require('../utils/browser.helper');
const { prisma } = require('../config/db');
const logger = require('../utils/logger');
const { rules, getRandomInt, loadGmapProxies, GmapProxyRotator, GMAP_PROXY_RULES } = require('../config/scraper.rules');
const { parseAddress } = require('../utils/address.parser');
const { sendNotificationEmail } = require('../Services/mail.service');
const browserMonitor = require('../utils/browser.monitor');

// Module-level rotator — persists across jobs so round-robin stays in sync
const _gmapProxies = loadGmapProxies();
const gmapRotator  = _gmapProxies.length > 0 ? new GmapProxyRotator(_gmapProxies) : null;
if (gmapRotator) {
  logger.info(`🔒 GMaps proxy pool ready: ${gmapRotator.total} proxies loaded (round-robin per job).`);
}

/**
 * Utility to pause execution
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Background Google Maps Scraper
 */
const runMapsScraper = async (query, scrapingJobId, leadType) => {
  let browser         = null;
  let page            = null;
  let dedicatedBrowser = null; // non-null only when we launched a proxy browser

  try {
    if (gmapRotator) {
      const proxy = gmapRotator.next();
      logger.info(`🗺️ Starting Google Maps scraper with proxy ${proxy.host}:${proxy.port} (${gmapRotator.total} in pool): "${query}"`);
      dedicatedBrowser = await launchProxyBrowser(proxy);
      browser = dedicatedBrowser;
    } else {
      logger.info(`🗺️ Starting Google Maps scraper (Pooled Instance): "${query}"`);
      browser = await getBrowser();
    }

    page = await browser.newPage();
    browserMonitor.trackPageOpen();
    
    // Simulate realistic user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // 🎯 DYNAMIC TARGET: Aim for 50-60 BRAND NEW leads (prevents pattern detection)
    const targetNewLeads = getRandomInt(50, 60);
    let newLeadsFound = 0;
    let totalScrolled = 0;
    // 🛑 DYNAMIC SAFETY STOP: Randomize depth between 18-22 cycles for 300+ leads
    const MAX_SCROLL_CYCLES = getRandomInt(18, 22);
    let captchaDetected = false;
    let slowResponseCount = 0;
    let lastScrollTime = Date.now();

    logger.info(`🎯 Goal: Find ${targetNewLeads} NEW leads. (Safety Stop: ${MAX_SCROLL_CYCLES} cycles)`);

    // Direct search URL for Google Maps
    const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}/`;
    logger.info(`Navigating to: ${searchUrl}`);
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // 🍪 HANDLE COOKIE CONSENT BANNER (Often blocks the screen on cloud IPs)
    try {
      logger.info('Checking for Google Cookie Consent popup...');
      const acceptButton = await page.waitForSelector('button[aria-label="Accept all"], form[action*="consent"] button', { timeout: 5000 });
      if (acceptButton) {
        logger.info('Google Consent popup found. Clicking Accept...');
        await acceptButton.click();
        await sleep(3000); // Wait for the UI to unlock
      }
    } catch (e) {
      logger.info('No cookie consent popup detected (Normal).');
    }

    // Wait for the feed container to appear (this holds the listings)
    try {
        await page.waitForSelector('div[role="feed"]', { timeout: 45000 });
    } catch (err) {
        logger.error(`Could not find the Maps feed container within 45s. The page structure might have changed or Google blocked the IP.`);
        throw err;
    }

    const processedLinks = new Set(); // Keep track of links we've visited in THIS run

    // --- MAIN HYBRID LOOP ---
    while (newLeadsFound < targetNewLeads && totalScrolled < MAX_SCROLL_CYCLES && !captchaDetected) {
      totalScrolled++;
      logger.info(`📜 Scroll Cycle ${totalScrolled}/${MAX_SCROLL_CYCLES} | Progress: ${newLeadsFound}/${targetNewLeads} new leads`);

      // 🤖 CAPTCHA DETECTION: Check every 5 scrolls
      if (totalScrolled % 5 === 0) {
        try {
          const hasCaptcha = await page.evaluate(() => {
            const captchaSelectors = [
              'iframe[src*="recaptcha"]',
              'iframe[src*="captcha"]',
              '#captcha',
              '.g-recaptcha',
              'div[id*="captcha"]'
            ];
            return captchaSelectors.some(selector => document.querySelector(selector) !== null);
          });
          
          if (hasCaptcha) {
            logger.error('🤖 CAPTCHA DETECTED! Stopping scraper gracefully...');
            captchaDetected = true;
            break;
          }
        } catch (e) {
          logger.warn('Captcha check failed, continuing...');
        }
      }

      const scrollStartTime = Date.now();

      // 1. Scroll down to load more results
      for (let i = 0; i < 8; i++) {
        const stepSize = getRandomInt(rules.scroll.step.min, rules.scroll.step.max);
        await page.evaluate((step) => {
          const feed = document.querySelector('div[role="feed"]');
          if (feed) feed.scrollBy(0, step);
        }, stepSize);
        await sleep(getRandomInt(500, 1000));
      }

      // 2. Identify all visible listing links
      const visibleLinks = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a.hfpxzc')).map(a => a.href);
      });

      // 🐌 RATE LIMIT DETECTION: Check response time
      const scrollDuration = Date.now() - scrollStartTime;
      if (scrollDuration > 10000) { // 10s threshold
        slowResponseCount++;
        logger.warn(`⚠️ Slow response detected (${scrollDuration}ms). Count: ${slowResponseCount}`);
        
        if (slowResponseCount >= 3) {
          logger.warn('🐌 Possible rate limiting. Adding adaptive delay...');
          await sleep(getRandomInt(5000, 10000));
          slowResponseCount = 0; // Reset counter
        }
      } else {
        slowResponseCount = Math.max(0, slowResponseCount - 1); // Decay counter
      }

      // 3. Filter for links we haven't checked in this run yet
      const linksToProcess = visibleLinks.filter(link => !processedLinks.has(link));
      
      if (linksToProcess.length === 0) {
          logger.info("🏁 No new links visible. Checking for end of list...");
          const isEnd = await page.evaluate(() => document.body.innerText.includes("You've reached the end of the list"));
          if (isEnd) break;
          continue; 
      }

      // 4. Extract details for each visible link
      for (const url of linksToProcess) {
        if (newLeadsFound >= targetNewLeads) break;
        processedLinks.add(url);

        const detailPage = await browser.newPage();
        browserMonitor.trackPageOpen();
        try {
          const response = await detailPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
          
          // 🟢 FIX: Check HTTP status before extracting data
          if (!response || response.status() >= 400) {
            logger.warn(`⚠️ Skipping ${url}: HTTP ${response?.status() || 'unknown'}`);
            continue;
          }
          
          await sleep(getRandomInt(2000, 4000));

          const leadData = await detailPage.evaluate(() => {
            const nameEl = document.querySelector('h1');
            const name = nameEl ? nameEl.innerText.trim() : null;
            const addressEl = document.querySelector('button[data-item-id="address"]');
            const address = addressEl ? addressEl.innerText.trim() : null;
            const websiteEl = document.querySelector('a[data-item-id="authority"]');
            const website = websiteEl ? websiteEl.href : null;
            const phoneEl = document.querySelector('button[data-item-id^="phone:tel:"]');
            const phone = phoneEl ? phoneEl.innerText.trim() : null;
            
            // Extract rating and reviews
            let rating = null;
            let reviews = null;
            const f7niceText = document.querySelector('div.F7nice')?.textContent.trim();
            if (f7niceText) {
              const match = f7niceText.match(/([0-9]+(?:[.,][0-9]+)?)\s*\(?([\d,.\s]+)\)?/);
              if (match) {
                rating = parseFloat(match[1].replace(',', '.'));
                const revNum = parseInt(match[2].replace(/[^\d]/g, ''), 10);
                if (!isNaN(revNum)) reviews = revNum;
              }
            }
            if (rating === null) {
              const ratingEl = document.querySelector('span.MW4etd');
              if (ratingEl) {
                const num = parseFloat(ratingEl.textContent.trim().replace(',', '.'));
                if (!isNaN(num)) rating = num;
              }
            }
            if (reviews === null) {
              const reviewAriaEl = document.querySelector('button[aria-label*="reviews"], span[aria-label*="reviews"]');
              if (reviewAriaEl) {
                const ariaLabel = reviewAriaEl.getAttribute('aria-label') || '';
                const match = ariaLabel.match(/([\d,.]+)\s*reviews/i);
                if (match) {
                  const revNum = parseInt(match[1].replace(/[^\d]/g, ''), 10);
                  if (!isNaN(revNum)) reviews = revNum;
                }
              }
            }

            // Extract last review snippet from overview page (if visible)
            let lastReview = null;
            const snippetTextEl = document.querySelector('.wiI7pd') || document.querySelector('.MyEned');
            if (snippetTextEl) {
              lastReview = snippetTextEl.textContent.trim();
            }
            
            return { name, address, website, phone, rating, reviews, lastReview };
          });

          // Attempt to click the reviews tab to load the detailed latest review with date
          try {
            const reviewTabBtn = await detailPage.$('button[aria-label*="reviews"], div.F7nice');
            if (reviewTabBtn) {
              await reviewTabBtn.click();
              await sleep(2000); // Allow time for reviews panel to transition/load
              
              const reviewsInfo = await detailPage.evaluate(() => {
                const reviewCard = document.querySelector('.jftiEf');
                if (reviewCard) {
                  const dateText = reviewCard.querySelector('.rsqaWe')?.textContent.trim() || '';
                  const bodyText = reviewCard.querySelector('.wiI7pd')?.textContent.trim() || reviewCard.querySelector('.MyEned')?.textContent.trim() || '';
                  if (dateText || bodyText) {
                    return `${dateText} - ${bodyText}`.trim().replace(/^-\s*|\s*-$/g, '');
                  }
                }
                return null;
              });

              if (reviewsInfo) {
                leadData.lastReview = reviewsInfo;
              }
            }
          } catch (clickErr) {
            logger.warn(`Could not load detailed reviews tab: ${clickErr.message}`);
          }

          if (leadData.name && leadData.address) {
            const uniqueKey = Buffer.from(`${leadData.name}-${leadData.address}`).toString('base64');

            // 🔍 CHECK IF DUPLICATE
            const existingLead = await prisma.lead.findUnique({ where: { uniqueKey } });

            if (existingLead) {
               // 🟠 OLD LEAD: Ignore it so it stays with its ORIGINAL batch.
               // We move to the next link quietly without stealing Job IDs.
               continue; 
            } else {
               // 🟢 NEW LEAD
               const { area, city, state, country } = parseAddress(leadData.address);
               try {
                 await prisma.lead.create({
                   data: {
                     name: leadData.name,
                     address: leadData.address,
                     website: leadData.website,
                     hasWebsite: !!leadData.website,
                     phone: leadData.phone,
                     rating: leadData.rating,
                     reviews: leadData.reviews,
                     lastReview: leadData.lastReview,
                     keyword: query, 
                     leadType: leadType || null,
                     source: 'google_maps',
                     mapsScraped: true,
                     uniqueKey: uniqueKey,
                     scrapingJobId: scrapingJobId ? parseInt(scrapingJobId) : null,
                     area, city, state, country
                   }
                 });

                 newLeadsFound++;
                 if (scrapingJobId) {
                    await prisma.scrapingJob.update({
                      where: { id: parseInt(scrapingJobId) },
                      data: { results: { increment: 1 } }
                    }).catch(() => {});
                 }
                 logger.info(`✨ NEW Lead Found (${newLeadsFound}/${targetNewLeads}): ${leadData.name}`);
               } catch (dbError) {
                 if (dbError.message.includes('Foreign key constraint')) {
                   logger.error(`❌ Job ID ${scrapingJobId} no longer exists. Stopping scraper...`);
                   throw new Error('Job deleted during scraping');
                 }
                 throw dbError;
               }
            }
          }
        } catch (err) {
          logger.warn(`⚠️ Detail extraction skipped: ${err.message}`);
        } finally {
          if (detailPage) {
            await detailPage.close();
            browserMonitor.trackPageClose();
          }
        }
      }

      const wavePause = getRandomInt(3000, 6000);
      logger.info(`⏳ Wave completed. Pause: ${wavePause / 1000}s...`);
      await sleep(wavePause);
    }

    // Handle captcha detection
    if (captchaDetected) {
      logger.error(`⚠️ Scraping stopped due to CAPTCHA after ${newLeadsFound} leads`);
      if (scrapingJobId) {
        await prisma.scrapingJob.update({
          where: { id: parseInt(scrapingJobId) },
          data: { 
            status: 'FAILED',
            error: 'CAPTCHA detected - manual intervention required'
          }
        });
      }
      throw new Error('CAPTCHA_DETECTED');
    }

    // Wrap up job
    if (scrapingJobId) {
      await prisma.scrapingJob.update({
        where: { id: parseInt(scrapingJobId) },
        data: { status: 'COMPLETED' }
      });
      logger.info(`✅ Job ${scrapingJobId} marked COMPLETED.`);

      try {
        await sendNotificationEmail(
          `Scraping Job #${scrapingJobId} Finished`,
          `Status: SUCCESS\nQuery: "${query}"\nNew Leads: ${newLeadsFound}\nTotal Depth: ${totalScrolled} cycles`
        );
      } catch (err) {}
    }

  } catch (error) {
    logger.error(`❌ Fatal Scraper Error: ${error.message}`);
    if (scrapingJobId) {
      await prisma.scrapingJob.update({
        where: { id: parseInt(scrapingJobId) },
        data: { status: 'FAILED' }
      }).catch(() => {});
    }
  } finally {
    if (page) {
      await page.close().catch(() => {});
      browserMonitor.trackPageClose();
    }
    // Only close if we launched a dedicated proxy browser — never close the shared pool
    if (dedicatedBrowser) {
      await dedicatedBrowser.close().catch(() => {});
    }
  }
};

module.exports = { runMapsScraper };

const { getBrowser } = require('../utils/browser.helper');
const { prisma } = require('../config/db');
const logger = require('../utils/logger');
const { rules, getRandomInt } = require('../config/scraper.rules');
const { parseAddress } = require('../utils/address.parser');
const { sendNotificationEmail } = require('../Services/mail.service');
const browserMonitor = require('../utils/browser.monitor');

/**
 * Utility to pause execution
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Background Google Maps Scraper
 */
const runMapsScraper = async (query, scrapingJobId, leadType) => {
  let browser = null;
  let page = null;
  try {
    logger.info(`🗺️ Starting Google Maps scraper (Pooled Instance): "${query}"`);

    // 🟠 POOLING: Get the shared browser instead of launching a new one
    browser = await getBrowser();
    page = await browser.newPage();
    browserMonitor.trackPageOpen();
    
    // Simulate realistic user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // 🎯 DYNAMIC TARGET: Aim for 50-60 BRAND NEW leads (prevents pattern detection)
    const targetNewLeads = getRandomInt(50, 60);
    let newLeadsFound = 0;
    let totalScrolled = 0;
    // 🛑 DYNAMIC SAFETY STOP: Randomize depth between 10-15 cycles
    const MAX_SCROLL_CYCLES = getRandomInt(10, 15);

    logger.info(`🎯 Goal: Find ${targetNewLeads} NEW leads. (Safety Stop: ${MAX_SCROLL_CYCLES} cycles)`);

    // Direct search URL for Google Maps
    const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}/`;
    logger.info(`Navigating to: ${searchUrl}`);
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Wait for the feed container to appear (this holds the listings)
    await page.waitForSelector('div[role="feed"]', { timeout: 15000 });

    const processedLinks = new Set(); // Keep track of links we've visited in THIS run

    // --- MAIN HYBRID LOOP ---
    while (newLeadsFound < targetNewLeads && totalScrolled < MAX_SCROLL_CYCLES) {
      totalScrolled++;
      logger.info(`📜 Scroll Cycle ${totalScrolled}/${MAX_SCROLL_CYCLES} | Progress: ${newLeadsFound}/${targetNewLeads} new leads`);

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
            
            return { name, address, website, phone };
          });

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
               await prisma.lead.create({
                 data: {
                   name: leadData.name,
                   address: leadData.address,
                   website: leadData.website,
                   hasWebsite: !!leadData.website,
                   phone: leadData.phone,
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
      await page.close();
      browserMonitor.trackPageClose();
    }
  }
};

module.exports = { runMapsScraper };

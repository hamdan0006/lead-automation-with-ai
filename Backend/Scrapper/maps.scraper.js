const puppeteer = require('puppeteer');
const { prisma } = require('../config/db');
const logger = require('../utils/logger');
const { rules, getRandomInt } = require('../config/scraper.rules');
const { parseAddress } = require('../utils/address.parser');

/**
 * Utility to pause execution
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Background Google Maps Scraper
 * @param {string} query - The search query (e.g. "real estate agents in Miami")
 */
const runMapsScraper = async (query) => {
  let browser = null;
  try {
    logger.info(`🗺️ Starting Google Maps background scraper for: "${query}"`);

    // Launch headless Puppeteer
    browser = await puppeteer.launch({
      headless: true, // Run in background completely
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
    });

    const page = await browser.newPage();
    // Simulate realistic user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Determine target number of leads for this run (80-120 randomly)
    const targetLeadCount = getRandomInt(rules.leadsPerRun.min, rules.leadsPerRun.max);
    logger.info(`🎯 Target leads for this run: ${targetLeadCount}`);

    // Direct search URL for Google Maps
    const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}/`;
    logger.info(`Navigating to: ${searchUrl}`);
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Wait for the feed container to appear (this holds the listings)
    await page.waitForSelector('div[role="feed"]', { timeout: 15000 });

    let extractedLinks = new Set();
    let scrollCount = 0;
    
    // Calculate first long pause threshold
    let nextLongPauseAt = getRandomInt(rules.scroll.triggerLongPauseAfter.min, rules.scroll.triggerLongPauseAfter.max);

    // Phase 1: Scroll and collect listing URLs
    logger.info(`📜 Beginning scrolling phase...`);
    while (extractedLinks.size < targetLeadCount) {
      // 1. Randomized scroll steps
      const stepSize = getRandomInt(rules.scroll.step.min, rules.scroll.step.max);
      
      await page.evaluate((step) => {
        const feed = document.querySelector('div[role="feed"]');
        if (feed) feed.scrollBy(0, step);
      }, stepSize);

      scrollCount++;

      // 2. User Interaction Simulation - Random Mouse Movements over the feed
      if (Math.random() > 0.5) { // 50% chance to simulate user moving mouse
        const randomX = getRandomInt(100, 400); // within the side panel roughly
        const randomY = getRandomInt(200, 800);
        await page.mouse.move(randomX, randomY, { steps: getRandomInt(5, 15) });
      }

      // Short Delay (2-5 seconds random)
      const shortDelayMs = getRandomInt(rules.scroll.shortDelay.min, rules.scroll.shortDelay.max);
      await sleep(shortDelayMs);

      // Check for Long Pause
      if (scrollCount >= nextLongPauseAt) {
        // 3. Unpredictability: Sometimes skip the long pause randomly (20% chance to skip)
        if (Math.random() > 0.2) {
          const longPauseMs = getRandomInt(rules.scroll.longPause.min, rules.scroll.longPause.max);
          logger.info(`⏳ Triggering occasional long human-like pause: ${longPauseMs / 1000} seconds...`);
          await sleep(longPauseMs);
        } else {
          logger.info(`⚡ Randomly skipping long pause to simulate unpredictable behavior.`);
        }
        
        // Reset scroll counter and determine next threshold
        scrollCount = 0;
        nextLongPauseAt = getRandomInt(rules.scroll.triggerLongPauseAfter.min, rules.scroll.triggerLongPauseAfter.max);
      }

      // Collect links from currently visible items
      const newLinks = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a.hfpxzc'));
        return links.map(a => a.href);
      });

      newLinks.forEach(link => extractedLinks.add(link));
      
      // Stop if end of list is reached (no height changes)
      // For brevity, we assume we just break if we have enough.
      if (extractedLinks.size >= targetLeadCount) {
        break;
      }
    }

    // Convert Set to Array and shuffle them to simulate random selection
    let linksArray = Array.from(extractedLinks).sort(() => 0.5 - Math.random());
    // Only take the exact Random target count (e.g., exactly 85 leads)
    const finalLinksToScrape = linksArray.slice(0, targetLeadCount);

    logger.info(`✅ Gathered ${finalLinksToScrape.length} random listings. Proceeding to extract details.`);

    // Phase 2: Open each link to extract detailed data
    let successCount = 0;
    for (const url of finalLinksToScrape) {
      const detailPage = await browser.newPage();
      try {
        await detailPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        // Minor wait for details to populate
        await sleep(getRandomInt(1000, 3000));

        // Data Extraction
        const leadData = await detailPage.evaluate(() => {
          // Google Maps DOM selectors (these can be brittle and change frequently)
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
          // Parse address into structured location fields
          const { area, city, state, country } = parseAddress(leadData.address);

          // Unique Key generation
          const uniqueKey = Buffer.from(`${leadData.name}-${leadData.address}`).toString('base64');

          // Save to Database
          await prisma.lead.upsert({
            where: { uniqueKey },
            update: {}, // Don't override existing if duplicating
            create: {
              name: leadData.name,
              address: leadData.address,
              website: leadData.website,
              hasWebsite: !!leadData.website,
              phone: leadData.phone,
              source: 'google_maps',
              mapsScraped: true,
              uniqueKey: uniqueKey,
              // Parsed location fields
              area,
              city,
              state,
              country
            }
          });

          logger.info(`✅ Saved Lead: ${leadData.name} | ${city}, ${state}, ${country}`);
          successCount++;
        }

      } catch (err) {
        logger.warn(`❌ Failed to scrape listing details: ${err.message}`);
      } finally {
        await detailPage.close();
      }
    }

    logger.info(`🎉 Scraper job completed! Successfully saved ${successCount} leads to DB.`);

  } catch (error) {
    logger.error(`❌ Fatal Error in Google Maps Scraper: ${error.message}`);
  } finally {
    if (browser) await browser.close();
  }
};

module.exports = {
  runMapsScraper
};

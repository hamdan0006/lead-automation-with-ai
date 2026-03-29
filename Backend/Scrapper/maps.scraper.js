const puppeteer = require('puppeteer');
const { prisma } = require('../config/db');
const logger = require('../utils/logger');
const { rules, getRandomInt } = require('../config/scraper.rules');
const { parseAddress } = require('../utils/address.parser');
const { sendNotificationEmail } = require('../Services/mail.service');

/**
 * Utility to pause execution
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Background Google Maps Scraper
 * @param {string} query - The search query (e.g. "real estate agents in Miami")
 * @param {number} scrapingJobId - The ID of the database record tracking this job
 * @param {string} leadType - Tag for categorization (e.g., "Real estate")
 */
const runMapsScraper = async (query, scrapingJobId, leadType) => {
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
    let lastFoundCount = 0;
    let idleScrolls = 0;

    while (extractedLinks.size < targetLeadCount) {
      // 1. Randomized scroll steps
      const stepSize = getRandomInt(rules.scroll.step.min, rules.scroll.step.max);
      
      await page.evaluate((step) => {
        const feed = document.querySelector('div[role="feed"]');
        if (feed) feed.scrollBy(0, step);
      }, stepSize);

      scrollCount++;

      // 2. User Interaction Simulation - Random Mouse Movements and Clicks over the feed
      if (Math.random() > 0.6) { // Reduced frequency of mouse activity to keep scrolling efficient
        const randomX = getRandomInt(100, 400); 
        const randomY = getRandomInt(200, 800);
        await page.mouse.move(randomX, randomY, { steps: 5 });
        
        // Occasional human-like "focus click" on empty space in feed
        if (Math.random() > 0.85) {
          await page.mouse.click(randomX, randomY);
        }
      }

      // Variable Delay 
      await sleep(getRandomInt(rules.scroll.shortDelay.min, rules.scroll.shortDelay.max));

      // Check for Long Pause
      if (scrollCount >= nextLongPauseAt) {
        if (Math.random() > 0.4) { // Only do long pauses 60% of the time to keep things moving
          const longPauseMs = getRandomInt(rules.scroll.longPause.min, rules.scroll.longPause.max);
          logger.info(`⏳ Human-like pause: ${longPauseMs / 1000}s...`);
          await sleep(longPauseMs);
        }
        scrollCount = 0;
        nextLongPauseAt = getRandomInt(rules.scroll.triggerLongPauseAfter.min, rules.scroll.triggerLongPauseAfter.max);
      }

      // Collect links from currently visible items
      const newLinks = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a.hfpxzc'));
        return links.map(a => a.href);
      });

      newLinks.forEach(link => extractedLinks.add(link));

      // 🛑 END OF LIST DETECTION
      if (extractedLinks.size === lastFoundCount) {
        idleScrolls++;
        if (idleScrolls > 8) { // If we've scrolled 8 times and found nothing new, we're likely at the end
          logger.info(`🏁 Bottom of list reached or no more leads found. Moving to extraction.`);
          break;
        }
      } else {
        lastFoundCount = extractedLinks.size;
        idleScrolls = 0; // Reset if we found something new
      }
      
      if (extractedLinks.size % 20 === 0 && extractedLinks.size !== 0) {
        logger.info(`📊 Progress: Collected ${extractedLinks.size} listing URLs...`);
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
        // Human Simulation: Click on the item from the feed view (if we were on the main page)
        // Since we are opening a new page for each detail (to keep state clean), 
        // we will simulate the behavior of a user "opening in a new tab" via clicking.
        
        await detailPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        // Simulating a user "clicking" and "hovering" on the page once it loads
        if (Math.random() > 0.4) {
          await detailPage.mouse.move(getRandomInt(100, 600), getRandomInt(100, 600), { steps: 10 });
          // Click on the name or empty space to simulate focus
          await detailPage.click('h1').catch(() => {});
        }

        // Minor wait for details to populate - more variable duration
        await sleep(getRandomInt(2000, 5000));

        // Enable console logging from inside the page for debugging
        detailPage.on('console', msg => {
          if (msg.type() === 'log') logger.info(`[Browser Log] ${msg.text()}`);
        });

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

          // --- ROBUST RATING EXTRACTION ---
          let rating = null;
          const ratingEl = document.querySelector('span[aria-label*="stars"]');
          if (ratingEl && ratingEl.ariaLabel) {
            rating = parseFloat(ratingEl.ariaLabel.split(' ')[0]);
          } else {
             // Fallback: look for the text in the known rating class
             const fallbackRating = document.querySelector('span.MW497e');
             if (fallbackRating) rating = parseFloat(fallbackRating.innerText);
          }

          // --- ROBUST REVIEWS EXTRACTION ---
          let reviews = null;
          const reviewsEl = document.querySelector('button[aria-label*="reviews"]');
          if (reviewsEl && reviewsEl.ariaLabel) {
            reviews = parseInt(reviewsEl.ariaLabel.replace(/[^0-9]/g, ''));
          } else {
            // Fallback 1: Any button with "reviews" in aria-label
            const anyReviewBtn = Array.from(document.querySelectorAll('button')).find(b => b.ariaLabel && b.ariaLabel.toLowerCase().includes('review'));
            if (anyReviewBtn) {
              reviews = parseInt(anyReviewBtn.ariaLabel.replace(/[^0-9]/g, ''));
            } else {
              // Fallback 2: Look for the text count inside the rating container region
              const reviewsTextEl = document.querySelector('span.fontBodyMedium span[aria-label*="reviews"]');
              if (reviewsTextEl) {
                reviews = parseInt(reviewsTextEl.ariaLabel.replace(/[^0-9]/g, ''));
              } else {
                // Fallback 3: Search for parentheses count (e.g. "(123)") near the rating
                const allSpans = Array.from(document.querySelectorAll('span'));
                const parenMatch = allSpans.find(s => s.innerText && /^\(\d[,.\d]*\)$/.test(s.innerText.trim()));
                if (parenMatch) {
                  reviews = parseInt(parenMatch.innerText.replace(/[^0-9]/g, ''));
                }
              }
            }
          }

          console.log(`Extracted for ${name}: Rating=${rating}, Reviews=${reviews}`);

          return { name, address, website, phone, rating, reviews };
        });

        if (leadData.name && leadData.address) {
          // Parse address into structured location fields
          const { area, city, state, country } = parseAddress(leadData.address);

          // Unique Key generation
          const uniqueKey = Buffer.from(`${leadData.name}-${leadData.address}`).toString('base64');

          // Save to Database
          await prisma.lead.upsert({
            where: { uniqueKey },
            update: {
              rating: leadData.rating,
              reviews: leadData.reviews
            }, 
            create: {
              name: leadData.name,
              address: leadData.address,
              website: leadData.website,
              hasWebsite: !!leadData.website,
              phone: leadData.phone,
              rating: leadData.rating,
              reviews: leadData.reviews,
              keyword: query, 
              leadType: leadType || null,
              source: 'google_maps',
              mapsScraped: true,
              uniqueKey: uniqueKey,
              scrapingJobId: scrapingJobId,
              area,
              city,
              state,
              country
            }
          });

          // 📈 Real-time Progress Update: Increment the results count in the ScrapingJob table
          if (scrapingJobId) {
            await prisma.scrapingJob.update({
              where: { id: scrapingJobId },
              data: { results: { increment: 1 } }
            }).catch(() => {}); // Silent failure for non-critical counter
          }

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

    // 3. Finalize Job Status in the Database
    if (scrapingJobId) {
      await prisma.scrapingJob.update({
        where: { id: scrapingJobId },
        data: {
          status: 'COMPLETED'
          // results is now updated incrementally!
        }
      });
      logger.info(`✅ Updated Scraping Job ${scrapingJobId} status to COMPLETED.`);

      // 🔔 Send Completion Notification
      try {
        await sendNotificationEmail(
          `Scraping Job #${scrapingJobId} Completed!`,
          `Google Maps Scraper has successfully completed Job #${scrapingJobId} for query "${query}".\n\n🎯 Results: ${successCount} leads gathered.\n📁 Lead Type: ${leadType || 'General'}\n✅ Success Rate: ${Math.round((successCount / targetLeadCount) * 100)}%`
        );
      } catch (err) {
        logger.warn(`⚠️ Failed to send completion notification: ${err.message}`);
      }
    }

  } catch (error) {
    logger.error(`❌ Fatal Error in Google Maps Scraper: ${error.message}`);
  } finally {
    if (browser) await browser.close();
  }
};

module.exports = {
  runMapsScraper
};

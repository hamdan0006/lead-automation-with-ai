const puppeteer = require('puppeteer');
const logger = require('../utils/logger');
const { runMapsScraper } = require('../Scrapper/maps.scraper');

const { prisma } = require('../config/db');

const performPuppeteerVerification = async () => {
  let browser = null;
  try {
    logger.info('Starting Puppeteer verification...');
    
    // Launch puppeteer in headless mode
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Navigate to a simple webpage
    logger.info('Navigating to example.com...');
    await page.goto('https://example.com', { waitUntil: 'domcontentloaded' });
    
    const title = await page.title();
    logger.info(`Successfully scraped title: ${title}`);
    
    await browser.close();
    
    return title;
  } catch (error) {
    if (browser) {
      await browser.close().catch(() => {});
    }
    throw error;
  }
};

const startMapsBackgroundScraping = async (query, leadType) => {
  try {
    const job = await prisma.scrapingJob.create({
      data: {
        url: `https://www.google.com/maps/search/${encodeURIComponent(query)}/`,
        leadType: leadType || null,
        status: 'PROCESSING',
        results: 0
      }
    });

    logger.info(`📝 Created Scraping Job ID: ${job.id} for query: "${query}"`);

    // 2. Run scraper in the background and pass the Job ID
    runMapsScraper(query, job.id, leadType).catch(async (err) => {
      logger.error(`Background scraper failed entirely for Job ${job.id}: ${err.message}`);
      // Update job status to FAILED
      await prisma.scrapingJob.update({
        where: { id: job.id },
        data: { status: 'FAILED' }
      }).catch(() => {});
    });

    return job;
  } catch (error) {
    logger.error(`Failed to initialize scraping job: ${error.message}`);
    throw error;
  }
};

module.exports = {
  performPuppeteerVerification,
  startMapsBackgroundScraping
};

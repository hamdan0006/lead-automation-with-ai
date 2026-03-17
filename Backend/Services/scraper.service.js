const puppeteer = require('puppeteer');
const logger = require('../utils/logger');
const { runMapsScraper } = require('../Scrapper/maps.scraper');

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

const startMapsBackgroundScraping = (query) => {
  // Run scraper in the background
  runMapsScraper(query).catch(err => {
    logger.error(`Background scraper failed entirely: ${err.message}`);
  });
};

module.exports = {
  performPuppeteerVerification,
  startMapsBackgroundScraping
};

const logger = require('../utils/logger');
const scraperService = require('../Services/scraper.service');

const verifyPuppeteer = async (req, res) => {
  try {
    const title = await scraperService.performPuppeteerVerification();
    
    res.status(200).json({
      success: true,
      message: 'Puppeteer is working successfully in the backend!',
      scrapedTitle: title
    });
  } catch (error) {
    logger.error(`Puppeteer verification failed: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Puppeteer verification failed.',
      error: error.message
    });
  }
};

const triggerMapsScraper = async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ success: false, message: 'Query is required.' });
    }

    scraperService.startMapsBackgroundScraping(query);

    res.status(202).json({
      success: true,
      message: `Google Maps background scraper started successfully for query: "${query}". You can check the logs for progress.`
    });
  } catch (error) {
    logger.error(`Error starting maps scraper: ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to trigger Maps Scraper.', error: error.message });
  }
};

module.exports = {
  verifyPuppeteer,
  triggerMapsScraper
};

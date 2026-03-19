const logger = require('../utils/logger');
const scraperService = require('../Services/scraper.service');
const emailQueueService = require('../Services/emailQueue.service');
const mailService = require('../Services/mail.service');

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

    const job = await scraperService.startMapsBackgroundScraping(query);

    res.status(202).json({
      success: true,
      message: `Google Maps background scraper started successfully for query: "${query}".`,
      jobId: job.id
    });
  } catch (error) {
    logger.error(`Error starting maps scraper: ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to trigger Maps Scraper.', error: error.message });
  }
};

const triggerEmailExtraction = async (req, res) => {
  try {
    const { jobId } = req.body;
    const enqueuedCount = await emailQueueService.enqueueLeadsByJobId(jobId);

    const message = jobId 
      ? `Successfully enqueued ${enqueuedCount} leads from job #${jobId} for email extraction.`
      : `Successfully enqueued ${enqueuedCount} leads for email extraction.`;

    res.status(202).json({
      success: true,
      message,
      count: enqueuedCount
    });
  } catch (error) {
    logger.error(`Error triggering email extraction: ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to trigger email extraction.', error: error.message });
  }
};

const triggerEmailOutreach = async (req, res) => {
  try {
    const { jobId } = req.body;
    const enqueuedCount = await mailService.enqueueLeadsForOutreach(jobId);

    const message = jobId 
      ? `Successfully enqueued ${enqueuedCount} leads from job #${jobId} for outreach.`
      : `Successfully enqueued ${enqueuedCount} leads for outreach.`;

    res.status(202).json({
      success: true,
      message,
      count: enqueuedCount
    });
  } catch (error) {
    logger.error(`Error triggering email outreach: ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to trigger email outreach.', error: error.message });
  }
};

module.exports = {
  verifyPuppeteer,
  triggerMapsScraper,
  triggerEmailExtraction,
  triggerEmailOutreach
};

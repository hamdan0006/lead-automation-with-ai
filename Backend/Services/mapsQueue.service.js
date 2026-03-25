const { Queue } = require('bullmq');
const redis = require('../config/redis');
const logger = require('../utils/logger');

/**
 * BullMQ Maps Scraper Queue Definition
 */
const mapsQueue = new Queue('maps-scraper', {
  connection: redis,
});

/**
 * Add unique job to scrape Google Maps
 * @param {string} query 
 * @param {number} jobId 
 * @param {string} leadType 
 */
const addMapsScrapingJob = async (query, jobId, leadType) => {
  try {
    const job = await mapsQueue.add(
      `maps-scrape-${jobId}`,
      { query, jobId, leadType },
      {
        priority: 1,
        removeOnComplete: true, 
        removeOnFail: 100 
      }
    );

    logger.info(`✅ Added Maps Scraper Job ${jobId} to queue (BullMQ Job ID: ${job.id})`);
    return job;

  } catch (error) {
    logger.error(`❌ Failed to add Maps Scraper Job ${jobId} to queue: ${error.message}`);
    throw error;
  }
};

module.exports = {
  mapsQueue,
  addMapsScrapingJob
};

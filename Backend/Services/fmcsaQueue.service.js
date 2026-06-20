const { Queue } = require('bullmq');
const redis = require('../config/redis');
const logger = require('../utils/logger');

const fmcsaQueue = new Queue('fmcsa-scraper', { connection: redis });

/**
 * Add a unique FMCSA scraping job to the BullMQ queue.
 * @param {number} fromDot  Starting USDOT number
 * @param {number} toDot    Ending USDOT number
 * @param {number} jobId    TruckingJob DB id
 */
const addFmcsaScrapingJob = async (fromDot, toDot, jobId) => {
  try {
    const job = await fmcsaQueue.add(
      `fmcsa-scrape-${jobId}`,
      { fromDot, toDot, jobId },
      {
        jobId: `fmcsa-${jobId}`,   // Prevents duplicate queuing of the same job
        priority: 1,
        removeOnComplete: true,
        removeOnFail: 100,
      }
    );

    logger.info(`✅ FMCSA Job #${jobId} queued (DOT ${fromDot}–${toDot}, BullMQ ID: ${job.id})`);
    return job;
  } catch (error) {
    logger.error(`❌ Failed to queue FMCSA Job #${jobId}: ${error.message}`);
    throw error;
  }
};

module.exports = { fmcsaQueue, addFmcsaScrapingJob };

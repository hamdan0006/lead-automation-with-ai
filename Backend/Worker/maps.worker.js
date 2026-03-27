const { Worker } = require('bullmq');
const redis = require('../config/redis');
const logger = require('../utils/logger');
const { runMapsScraper } = require('../Scrapper/maps.scraper');
const { prisma } = require('../config/db');
const { rules, getRandomInt } = require('../config/scraper.rules');

/**
 * Utility to pause execution
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * BullMQ Worker for Maps Scraping
 * Concurrency is set to 1 so that scrapers run sequentially
 * and do not disturb each other.
 */
const startMapsWorker = () => {
  const worker = new Worker(
    'maps-scraper',
    async (job) => {
      const { query, jobId, leadType } = job.data;

      // 🛑 Anti-detection: Randomized gap between batches
      const waitMs = getRandomInt(rules.batchGap.min, rules.batchGap.max);
      logger.info(`⏳ Anti-detection: Waiting ${Math.round(waitMs / 1000)}s before starting Job ID ${jobId} for "${query}"...`);
      await sleep(waitMs);

      logger.info(`🗺️ Maps Worker processing Job ID ${jobId} for query: "${query}"`);

      // Update status to PROCESSING only when the worker actually starts
      if (jobId) {
        await prisma.scrapingJob.update({
          where: { id: jobId },
          data: { status: 'PROCESSING' }
        }).catch(() => {});
      }

      try {
        await runMapsScraper(query, jobId, leadType);
        
        logger.info(`✅ Maps Worker successfully finished Job ID ${jobId}`);
      } catch (error) {
        logger.error(`❌ Maps Worker failed Job ID ${jobId}: ${error.message}`);
        
        // Ensure database reflects the failed job status
        if (jobId) {
          await prisma.scrapingJob.update({
            where: { id: jobId },
            data: { status: 'FAILED' }
          }).catch(() => {});
        }
        
        throw error;
      }
    },
    {
      connection: redis,
      concurrency: 1, // Only one map scraping job at a time
    }
  );

  worker.on('failed', (job, err) => {
    logger.error(`❌ Maps Scraper Job failed (BullMQ Job ID: ${job.id}): ${err.message}`);
  });

  worker.on('error', (err) => {
    logger.error(`❌ BullMQ Maps Worker Error: ${err}`);
  });

  logger.info('🗺️ Maps Scraper Worker started and ready for jobs.');
};

module.exports = {
  startMapsWorker
};

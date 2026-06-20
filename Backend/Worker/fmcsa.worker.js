const { Worker } = require('bullmq');
const redis = require('../config/redis');
const logger = require('../utils/logger');
const { runFmcsaScraper } = require('../Scrapper/fmcsa.scraper');
const { prisma } = require('../config/db');

/**
 * BullMQ Worker for FMCSA SAFER scraping.
 * Concurrency 1 — runs jobs sequentially to avoid IP rate-limiting.
 */
const startFmcsaWorker = () => {
  const worker = new Worker(
    'fmcsa-scraper',
    async (job) => {
      const { fromDot, toDot, jobId } = job.data;

      logger.info(`🚛 FMCSA Worker: starting Job #${jobId} (DOT ${fromDot}–${toDot})`);

      // Verify the DB record still exists (user may have deleted it)
      if (jobId) {
        const exists = await prisma.truckingJob.findUnique({ where: { id: jobId } });
        if (!exists) {
          logger.error(`❌ TruckingJob #${jobId} not found in DB. Skipping.`);
          return;
        }

        await prisma.truckingJob.update({
          where: { id: jobId },
          data: { status: 'PROCESSING' },
        }).catch((err) => logger.error(`DB status update error: ${err.message}`));
      }

      try {
        await runFmcsaScraper(fromDot, toDot, jobId);
        logger.info(`✅ FMCSA Worker: Job #${jobId} finished.`);
      } catch (error) {
        logger.error(`❌ FMCSA Worker: Job #${jobId} failed — ${error.message}`);
        if (jobId) {
          await prisma.truckingJob.update({
            where: { id: jobId },
            data: { status: 'FAILED' },
          }).catch(() => {});
        }
        throw error;
      }
    },
    {
      connection: redis,
      concurrency: 1,
    }
  );

  worker.on('failed', (job, err) => {
    logger.error(`❌ FMCSA BullMQ job failed (ID: ${job?.id}): ${err.message}`);
  });

  worker.on('error', (err) => {
    logger.error(`❌ FMCSA Worker error: ${err}`);
  });

  logger.info('🚛 FMCSA Scraper Worker started and ready.');
  return worker;
};

module.exports = { startFmcsaWorker };

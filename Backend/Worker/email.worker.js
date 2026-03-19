const { Worker } = require('bullmq');
const redis = require('../config/redis'); // Use existing Redis connection
const logger = require('../utils/logger');
const { extractEmailsFromWebsite } = require('../Scrapper/email.scraper');
const { prisma } = require('../config/db');
const { addSendEmailJob } = require('../Services/mail.service');

/**
 * BullMQ Worker for Email Extraction
 */
const startEmailWorker = () => {
  const worker = new Worker(
    'email-extraction',
    async (job) => {
      const { leadId, websiteUrl } = job.data;

      if (!websiteUrl) {
        logger.warn(`Job ${job.id}: No website URL provided for lead ${leadId}`);
        return;
      }

      logger.info(`🔍 Processing email extraction for lead ${leadId}: ${websiteUrl}`);

      try {
        const emailsFound = await extractEmailsFromWebsite(websiteUrl);

        if (emailsFound.length > 0) {
          // Take the first email found (preferring business domain if needed, but for now just the first one)
          const chosenEmail = emailsFound[0];

          const updatedLead = await prisma.lead.update({
            where: { id: leadId },
            data: {
              email: chosenEmail,
              emailExtracted: true,
              websiteVisited: true,
              status: 'ENRICHED'
            }
          });

          logger.info(`✅ Lead ${leadId} enriched with email: ${chosenEmail}`);

          // 🚀 START NEW JOB: Send email using BullMQ once extraction is completed
          if (updatedLead.email) {
            await addSendEmailJob(updatedLead.id, updatedLead.email, updatedLead.name);
          }
        } else {
          // Flag as visited anyway
          await prisma.lead.update({
            where: { id: leadId },
            data: {
              websiteVisited: true,
              status: 'NO_EMAIL_FOUND'
            }
          });

          logger.info(`⚠️ No emails found for lead ${leadId} on ${websiteUrl}`);
        }
      } catch (error) {
        logger.error(`❌ Worker failed for lead ${leadId}: ${error.message}`);
        throw error; // Let BullMQ handle retry if configured
      }
    },
    {
      connection: redis,
      concurrency: 1 // One by one as requested
    }
  );

  worker.on('completed', (job) => {
    logger.info(`Job ${job.id} completed!`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`Job ${job.id} failed: ${err.message}`);
  });

  logger.info('🛰️ Email Extraction Worker started and ready for jobs.');
  return worker;
};

module.exports = {
  startEmailWorker
};

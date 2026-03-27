const { Worker } = require('bullmq');
const redis = require('../config/redis'); // Use existing Redis connection
const logger = require('../utils/logger');
const { extractEmailsFromWebsite, searchEmailsOnWeb } = require('../Scrapper/email.scraper');
const { prisma } = require('../config/db');

/**
 * BullMQ Worker for Email Extraction
 */
const startEmailWorker = () => {
  const worker = new Worker(
    'email-extraction',
    async (job) => {
      const { leadId, websiteUrl, name } = job.data;
      let foundEmails = [];
      let seoTitle = websiteUrl ? null : "No Website Found";
      let seoDescription = websiteUrl ? null : "This lead does not have a website URL stored in the system.";

      logger.info(`🔍 Processing email extraction for Lead #${leadId} (${name})`);

      try {
        // Step 1: Try standard website scraping if a URL exists
        if (websiteUrl) {
          logger.info(`🌐 Visiting website: ${websiteUrl}`);
          const scrapeResult = await extractEmailsFromWebsite(websiteUrl);
          foundEmails = scrapeResult.emails;
          seoTitle = scrapeResult.seoTitle;
          seoDescription = scrapeResult.seoDescription;
        }

        // Step 2: Web Search Fallback if no emails found OR no website exists
        if (foundEmails.length === 0 && name) {
          logger.info(`⚠️ No emails found via website. Trying Web Search fallback for: "${name}"`);
          const fallbackResult = await searchEmailsOnWeb(name);
          foundEmails = fallbackResult.emails;
        }

        // Step 3: Database Update
        if (foundEmails.length > 0) {
          // Take the first email found (best match usually appears first or is unique)
          const chosenEmail = foundEmails[0];

          await prisma.lead.update({
            where: { id: leadId },
            data: {
              email: chosenEmail,
              emailExtracted: true,
              websiteVisited: true,
              status: 'ENRICHED',
              seoTitle,
              seoDescription
            }
          });

          logger.info(`✅ Lead ${leadId} enriched with email: ${chosenEmail}`);

        } else {
          await prisma.lead.update({
            where: { id: leadId },
            data: {
              websiteVisited: true,
              status: 'NO_EMAIL_FOUND',
              seoTitle,
              seoDescription
            }
          });

          logger.info(`❌ No emails found for lead ${leadId} after all attempts.`);
        }
      } catch (error) {
        logger.error(`❌ Email Worker failed for lead ${leadId}: ${error.message}`);
        throw error; // Let BullMQ handle retry if configured
      }
    },
    {
      connection: redis,
      concurrency: 1, // One by one as requested
      lockDuration: 300000, 
      stalledInterval: 60000
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

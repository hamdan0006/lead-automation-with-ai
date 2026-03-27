const { Worker } = require('bullmq');
const redis = require('../config/redis'); // Use existing Redis connection
const logger = require('../utils/logger');
const { extractEmailsFromWebsite, searchEmailsOnWeb } = require('../Scrapper/email.scraper');
const { prisma } = require('../config/db');
const { validateEmail } = require('../utils/email.validator');

/**
 * BullMQ Worker for Email Extraction
 */
const startEmailWorker = () => {
  const worker = new Worker(
    'email-extraction',
    async (job) => {
      const { leadId, websiteUrl, name } = job.data;
      let rawEmails = [];
      let seoTitle = websiteUrl ? null : "No Website Found";
      let seoDescription = websiteUrl ? null : "This lead does not have a website URL stored in the system.";

      logger.info(`🔍 Processing email extraction for Lead #${leadId} (${name})`);

      try {
        // Step 1: Try standard website scraping if a URL exists
        if (websiteUrl) {
          logger.info(`🌐 Visiting website: ${websiteUrl}`);
          const scrapeResult = await extractEmailsFromWebsite(websiteUrl);
          rawEmails = scrapeResult.emails;
          seoTitle = scrapeResult.seoTitle;
          seoDescription = scrapeResult.seoDescription;
        }

        // Step 2: Web Search Fallback if no emails found OR no website exists
        if (rawEmails.length === 0 && name) {
          logger.info(`⚠️ No emails found via website. Trying Web Search fallback for: "${name}"`);
          const fallbackResult = await searchEmailsOnWeb(name);
          rawEmails = fallbackResult.emails;
        }

        // Step 3: Sort all found emails by "Best Match" logic (Prioritize company name keywords)
        const nameKeywords = name.toLowerCase().split(' ').filter(word => word.length > 3);
        const sortByRelevance = (a, b) => {
          const aMatches = nameKeywords.filter(kw => a.includes(kw)).length;
          const bMatches = nameKeywords.filter(kw => b.includes(kw)).length;
          if (bMatches !== aMatches) return bMatches - aMatches;
          const prefixes = ['info@', 'contact@', 'hello@'];
          const aPref = prefixes.some(p => a.startsWith(p));
          const bPref = prefixes.some(p => b.startsWith(p));
          if (aPref && !bPref) return -1;
          if (!aPref && bPref) return 1;
          return 0;
        };

        rawEmails.sort(sortByRelevance);

        // Step 4: Validate emails one by one and pick the first one that exists
        logger.info(`🛡️ Checking existence for ${rawEmails.length} prioritized emails...`);
        let chosenEmail = null;
        let bestGuessEmail = rawEmails[0] || null; // Fallback if no existence check passes

        for (const email of rawEmails) {
          const exists = await validateEmail(email);
          if (exists) {
            chosenEmail = email;
            break; // Stop at the first "verified" best match
          }
        }

        // Final Fallback: If no email passed existence, use the best "guess" from syntax-valid emails
        if (!chosenEmail && bestGuessEmail) {
          logger.warn(`⚠️ No emails for Lead #${leadId} passed the existence check. Falling back to best match: ${bestGuessEmail}`);
          chosenEmail = bestGuessEmail;
        }

        // Step 5: Database Update
        await prisma.lead.update({
          where: { id: leadId },
          data: {
            email: chosenEmail,
            emailExtracted: true,
            websiteVisited: true,
            status: chosenEmail ? 'ENRICHED' : 'NO_EMAIL_FOUND',
            seoTitle,
            seoDescription
          }
        });

        if (chosenEmail) {
          logger.info(`✅ Email saved for lead #${leadId}: ${chosenEmail}`);
        }

        logger.info(`✅ Job ${job.id} for lead #${leadId} completed. Status: ${chosenEmail ? 'ENRICHED' : 'NO_EMAIL_FOUND'}`);

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

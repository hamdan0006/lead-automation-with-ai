const { Worker } = require('bullmq');
const redis = require('../config/redis'); // Use existing Redis connection
const logger = require('../utils/logger');
const { extractEmailsFromWebsite, searchEmailsOnWeb } = require('../Scrapper/email.scraper');
const { prisma } = require('../config/db');
const { validateEmail } = require('../utils/email.validator');
const { sendNotificationEmail } = require('../Services/mail.service');

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
      let loadTime = null;
      let isResponsive = null;

      logger.info(`🔍 Processing email extraction for Lead #${leadId} (${name})`);

      try {
        // Step 1: Try standard website scraping if a URL exists
        if (websiteUrl) {
          logger.info(`🌐 Visiting website: ${websiteUrl}`);
          const scrapeResult = await extractEmailsFromWebsite(websiteUrl);
          rawEmails = scrapeResult.emails;
          seoTitle = scrapeResult.seoTitle;
          seoDescription = scrapeResult.seoDescription;
          loadTime = scrapeResult.loadTime;
          isResponsive = scrapeResult.isResponsive;
        }

        // Step 2: Web Search Fallback if NO emails found OR ONLY "info@" generic emails found
        const hasGoodEmail = rawEmails.some(e => !e.startsWith('info@') && !e.startsWith('office@') && !e.startsWith('admin@'));
        
        if ((rawEmails.length === 0 || !hasGoodEmail) && name) {
          logger.info(`⚠️ ${rawEmails.length === 0 ? 'No emails found' : 'Only generic (info@) emails found'} via website. Proactively trying Web Search fallback for: "${name}"`);
          const fallbackResult = await searchEmailsOnWeb(name);
          // Merge unique emails
          const combined = new Set([...rawEmails, ...fallbackResult.emails]);
          rawEmails = Array.from(combined);
        }

        // Step 3: Priority Scoring Logic
        // We want to deprioritize info@ and prioritize contact@, hello@, or personalized emails
        const nameKeywords = name.toLowerCase().split(' ').filter(word => word.length > 3);
        
        const getEmailScore = (email) => {
          let score = 0;
          const lowPriorityPrefixes = ['info@', 'office@', 'admin@', 'reception@', 'mail@'];
          const highPriorityPrefixes = ['contact@', 'hello@', 'support@', 'sales@'];
          
          const isLowPriority = lowPriorityPrefixes.some(p => email.startsWith(p));
          const isHighPriority = highPriorityPrefixes.some(p => email.startsWith(p));
          
          if (isHighPriority) score += 10;
          if (isLowPriority) score -= 20; // Heavy penalty for info@
          
          // Bonus for matching business name (personalization)
          const matches = nameKeywords.filter(kw => email.includes(kw)).length;
          score += (matches * 5);
          
          return score;
        };

        // Sort by score (descending)
        rawEmails.sort((a, b) => getEmailScore(b) - getEmailScore(a));

        // Step 4: Concurrent Validation
        // We will verify the top 5 candidates concurrently to save time and pick the best one
        const candidatesToVerify = rawEmails.slice(0, 5);
        logger.info(`🛡️ Concurrently verifying top ${candidatesToVerify.length} candidate emails...`);

        const verificationResults = await Promise.all(
          candidatesToVerify.map(async (email) => {
            const exists = await validateEmail(email);
            return { email, exists };
          })
        );

        let chosenEmail = verificationResults.find(r => r.exists)?.email || null;
        let bestGuessEmail = rawEmails[0] || null; // Absolute fallback

        // Final Logic: If no verified email found, but we have an info@ as fallback
        if (!chosenEmail && bestGuessEmail) {
          logger.warn(`⚠️ No candidate passed existence check for Lead #${leadId}. Using best match: ${bestGuessEmail}`);
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
            seoDescription,
            loadTime,
            isResponsive
          }
        });

        if (chosenEmail) {
          logger.info(`✅ Email saved for lead #${leadId}: ${chosenEmail}`);
        }

        logger.info(`✅ Job ${job.id} for lead #${leadId} completed. Status: ${chosenEmail ? 'ENRICHED' : 'NO_EMAIL_FOUND'}`);

        // 🔔 Check for Batch Completion
        const lead = await prisma.lead.findUnique({
          where: { id: leadId },
          select: { scrapingJobId: true }
        });

        if (lead?.scrapingJobId) {
          const remainingLeads = await prisma.lead.count({
            where: {
              scrapingJobId: lead.scrapingJobId,
              emailExtracted: false
            }
          });

          if (remainingLeads === 0) {
            // All leads in this batch are now enriched!
            const totalLeads = await prisma.lead.count({ where: { scrapingJobId: lead.scrapingJobId } });
            const leadsWithEmail = await prisma.lead.count({
              where: {
                scrapingJobId: lead.scrapingJobId,
                email: { not: null }
              }
            });

            logger.info(`🎉 Entire email enrichment process for Job #${lead.scrapingJobId} is COMPLETED!`);
            
            await sendNotificationEmail(
              `Email Enrichment Job #${lead.scrapingJobId} Completed!`,
              `The lead enrichment (email scraping) process for Job #${lead.scrapingJobId} is now finished.\n\n🎯 Total Leads: ${totalLeads}\n📧 Emails Found: ${leadsWithEmail}\n✅ Success Rate: ${Math.round((leadsWithEmail / totalLeads) * 100)}%`
            ).catch(err => logger.warn(`⚠️ Failed to send enrichment notification: ${err.message}`));
          }
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

const { Worker } = require('bullmq');
const redis = require('../config/redis'); // Use existing Redis connection
const logger = require('../utils/logger');
const { extractEmailsFromWebsite, searchEmailsOnWeb } = require('../Scrapper/email.scraper');
const { prisma } = require('../config/db');
const { validateEmail } = require('../utils/email.validator');
const { sendNotificationEmail } = require('../Services/mail.service');
const { rankEmailsWithAI } = require('../Services/aiEmail.service');

/**
 * BullMQ Worker for Email Extraction
 */
const startEmailWorker = () => {
  const worker = new Worker(
    'email-extraction',
    async (job) => {
      const { leadId, websiteUrl, name } = job.data;
      let seoTitle = websiteUrl ? null : 'No Website Found';
      let seoDescription = websiteUrl ? null : 'This lead does not have a website URL stored in the system.';
      let loadTime = null;
      let isResponsive = null;

      logger.info(`🔍 Processing email extraction for Lead #${leadId} (${name})`);

      try {
        let allCandidates = new Set();

        // Step 1: Scrape website for emails
        if (websiteUrl) {
          logger.info(`🌐 Visiting website: ${websiteUrl}`);
          const scrapeResult = await extractEmailsFromWebsite(websiteUrl);
          scrapeResult.emails.forEach(e => allCandidates.add(e.toLowerCase().trim()));
          
          seoTitle = scrapeResult.seoTitle;
          seoDescription = scrapeResult.seoDescription;
          loadTime = scrapeResult.loadTime;
          isResponsive = scrapeResult.isResponsive;
        }

        // Step 2: Web Search Fallback (always run if few candidates found to ensure variety)
        if (allCandidates.size < 3 && name) {
          logger.info(`🔍 Firing SerpStack fallback for additional candidates: "${name}"`);
          const fallbackResult = await searchEmailsOnWeb(name);
          fallbackResult.emails.forEach(e => allCandidates.add(e.toLowerCase().trim()));
        }

        const emailList = Array.from(allCandidates);
        let chosenEmail = null;
        let bestScore = -1; // -1: none, 0: possible, 1: highly likely, 2: excellent

        if (emailList.length > 0) {
          // Step 3: 🧠 AI REASONING - Rank candidates by value (decision makers first)
          logger.info(`🧠 AI Intelligence ranking ${emailList.length} candidates for "${name}"...`);
          const rankedEmails = await rankEmailsWithAI(name, emailList).catch(() => emailList);

          // Step 4: SMTP Validation on top ranked candidates
          const bizDomain = websiteUrl ? websiteUrl.replace(/^https?:\/\/(www\.)?/, '').split('/')[0] : null;

          // We check up to top 5 candidates derived from AI ranking
          for (const email of rankedEmails.slice(0, 5)) {
            const isValidated = await validateEmail(email);
            let score = 0;
            if (isValidated) {
              score = 2; // Perfect Match (Verified Live)
            } else if (bizDomain && email.includes(bizDomain)) {
              score = 1; // High Likelihood (Domain Match)
            }

            if (score > bestScore) {
              chosenEmail = email;
              bestScore = score;
            }
            if (bestScore === 2) break; // Break early if we found a verified winner!
          }
        }

        // Step 5: Database Update
        const isEnriched = !!chosenEmail;
        try {
          await prisma.lead.update({
            where: { id: leadId },
            data: {
              email: chosenEmail,
              emailExtracted: true,
              websiteVisited: true,
              status: isEnriched ? 'ENRICHED' : 'NO_EMAIL_FOUND',
              seoTitle,
              seoDescription,
              loadTime,
              isResponsive
            }
          });

          if (isEnriched) {
            const qualityStr = bestScore === 2 ? 'VERIFIED (Live)' : (bestScore === 1 ? 'AI LIKELY (Domain Match)' : 'POSSIBLE');
            logger.info(`✅ Winning email saved for lead #${leadId}: ${chosenEmail} | Quality: ${qualityStr}`);
          } else {
            logger.warn(`❌ No working email found for lead #${leadId}.`);
          }

          logger.info(`✅ Job ${job.id} for lead #${leadId} completed. Status: ${isEnriched ? 'ENRICHED' : 'NO_EMAIL_FOUND'}`);

        } catch (dbErr) {
          // Prisma Unique Constraint Violation (Email already exists on another lead)
          if (dbErr.code === 'P2002') {
            logger.warn(`♻️ Duplicate email found for lead #${leadId} (${chosenEmail}). Lead saved as DUPLICATE_EMAIL.`);
            
            await prisma.lead.update({
              where: { id: leadId },
              data: {
                email: null, // Don't save the duplicate email
                emailExtracted: true,
                websiteVisited: true,
                status: 'DUPLICATE_EMAIL',
                seoTitle,
                seoDescription,
                loadTime,
                isResponsive
              }
            });
          } else {
            throw dbErr; // Rethrow actual unexpected DB errors so they trigger retries
          }
        }

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
            // 🟢 ATOMIC FIX: Use Redis lock to prevent duplicate notifications
            const lockKey = `batch-email-complete:${lead.scrapingJobId}`;
            const locked = await redis.set(lockKey, '1', 'NX', 'EX', 60);
            
            if (locked) {
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
        }

      } catch (error) {
        logger.error(`❌ Email Worker failed for lead ${leadId}: ${error.message}`);

        if (job.attemptsMade >= (job.opts.attempts || 1) - 1) {
          logger.warn(`⚠️ Lead #${leadId} exhausted all retries. Marking as visited to unblock batch.`);
          await prisma.lead.update({
            where: { id: leadId },
            data: {
              websiteVisited: true,
              emailExtracted: true,
              status: 'NO_EMAIL_FOUND',
              seoTitle: seoTitle || 'Scrape Failed',
              seoDescription: `Failed after ${job.attemptsMade + 1} attempts: ${error.message.slice(0, 200)}`
            }
          }).catch(dbErr => logger.error(`❌ Could not mark lead #${leadId} as failed in DB: ${dbErr.message}`));

          try {
            const failedLead = await prisma.lead.findUnique({ where: { id: leadId }, select: { scrapingJobId: true } });
            if (failedLead?.scrapingJobId) {
              const remaining = await prisma.lead.count({
                where: { scrapingJobId: failedLead.scrapingJobId, emailExtracted: false }
              });
              if (remaining === 0) {
                // 🟢 ATOMIC FIX: Use Redis lock to prevent duplicate notifications
                const lockKey = `batch-email-complete:${failedLead.scrapingJobId}`;
                const locked = await redis.set(lockKey, '1', 'NX', 'EX', 60);
                
                if (locked) {
                  const totalLeads = await prisma.lead.count({ where: { scrapingJobId: failedLead.scrapingJobId } });
                  const leadsWithEmail = await prisma.lead.count({ where: { scrapingJobId: failedLead.scrapingJobId, email: { not: null } } });
                  logger.info(`🎉 Batch #${failedLead.scrapingJobId} fully processed (some leads failed). Total: ${totalLeads}, Emails: ${leadsWithEmail}.`);
                  await sendNotificationEmail(
                    `Email Enrichment Job #${failedLead.scrapingJobId} Completed!`,
                    `The lead enrichment process for Job #${failedLead.scrapingJobId} is now finished.\n\n🎯 Total Leads: ${totalLeads}\n📧 Emails Found: ${leadsWithEmail}\n✅ Success Rate: ${Math.round((leadsWithEmail / totalLeads) * 100)}%`
                  ).catch(err => logger.warn(`⚠️ Failed to send notification: ${err.message}`));
                }
              }
            }
          } catch (batchErr) {
            logger.error(`❌ Batch completion check failed: ${batchErr.message}`);
          }
        } else {
          throw error;
        }
      }
    },
    {
      connection: redis,
      concurrency: 3,
      lockDuration: 120000,
      stalledInterval: 30000
    }
  );

  worker.on('completed', (job) => {
    logger.info(`✅ Email extraction job ${job.id} completed.`);
  });

  worker.on('failed', (job, err) => {
    logger.warn(`⚠️ Email extraction job ${job.id} failed (attempt ${job.attemptsMade}/${job.opts.attempts || 1}): ${err.message}`);
  });

  worker.on('error', (err) => {
    logger.error(`❌ Email Worker encountered a critical error: ${err.message}`);
  });

  logger.info('🛰️ Email Extraction Worker started and ready for jobs.');
  return worker;
};

module.exports = {
  startEmailWorker
};

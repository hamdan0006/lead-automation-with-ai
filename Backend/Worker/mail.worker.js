const { Worker } = require('bullmq');
const redis = require('../config/redis');
const logger = require('../utils/logger');
const { sendEmail, addSendEmailJob } = require('../Services/mail.service');
const { prisma } = require('../config/db');
const { mailerRules, getRandomInt } = require('../config/mailer.rules');
const { generateOutreachBody, generateFollowUpBody } = require('../Services/aiEmail.service');

/**
 * Utility to pause execution
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Keep track of how many emails were sent in the current worker session
let emailsSentInSession = 0;
let nextLongPauseAt = getRandomInt(mailerRules.triggerLongPauseAfter.min, mailerRules.triggerLongPauseAfter.max);
const startMailWorker = () => {
  const worker = new Worker(
    'send-email',
    async (job) => {
      const { leadId, email, leadName } = job.data;

      if (!email) {
        logger.warn(`Job ${job.id}: No email provided for lead ${leadId}`);
        return;
      }

      logger.info(`📧 Sending email to lead ${leadId}: ${email}`);
      const { templateIds } = job.data;

      try {
        // Fetch full lead data to get company/name
        const lead = await prisma.lead.findUnique({ where: { id: leadId } });
        
        if (!lead) {
            logger.error(`Lead ${leadId} not found in database.`);
            return;
        }

        // Generate AI Content
        let aiContent = null;
        logger.info(`🤖 Generating AI email for lead ${leadId} (${job.data.isFollowUp ? 'Follow-up' : 'Outreach'})`);
        if (job.data.isFollowUp) {
            aiContent = await generateFollowUpBody(lead.name || 'there', lead.leadType);
        } else {
            aiContent = await generateOutreachBody(
                lead.name || 'Business Owner', 
                lead.leadType || 'business', 
                lead.city || 'your area'
            );
        }

        // 1. Send the email with the full lead data and AI content
        await sendEmail(email, lead, aiContent, job.data.isFollowUp || false);

        // 2. Update lead status to track contacts and schedule followups if needed
        if (!job.data.isFollowUp) {
            await prisma.lead.update({
              where: { id: leadId },
              data: {
                contacted: true,
                status: 'CONTACTED',
                lastEmailedAt: new Date(),
                followUpDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days from now
              }
            });
            logger.info(`✅ Lead ${leadId} status updated to CONTACTED.`);

            // Queue the follow-up email immediately with a BullMQ delay
            const followUpDelayMs = 3 * 24 * 60 * 60 * 1000;
            logger.info(`⏰ Scheduling follow-up for lead ${leadId} in 3 days...`);
            await addSendEmailJob(leadId, email, lead.name, true, followUpDelayMs);
        } else {
            // It was a follow up email
            await prisma.lead.update({
              where: { id: leadId },
              data: {
                followUpSent: true,
                status: 'FOLLOWED_UP',
                lastEmailedAt: new Date()
              }
            });
            logger.info(`✅ Follow-up sent and marked for lead ${leadId}.`);
        }
        
        // 3. Increment session counter
        emailsSentInSession++;

        // 4. Decide on next pause
        if (emailsSentInSession >= nextLongPauseAt) {
          const pauseDuration = getRandomInt(mailerRules.longPause.min, mailerRules.longPause.max);
          logger.info(`☕ Session session finished (${emailsSentInSession} sent). Taking a human-like break for ${Math.round(pauseDuration/60000)} minutes...`);
          
          await sleep(pauseDuration);
          
          // Reset counters
          emailsSentInSession = 0;
          nextLongPauseAt = getRandomInt(mailerRules.triggerLongPauseAfter.min, mailerRules.triggerLongPauseAfter.max);
        } else {
          // Normal gap between emails
          const gap = getRandomInt(mailerRules.delayBetweenEmails.min, mailerRules.delayBetweenEmails.max);
          logger.info(`⏳ Waiting ${Math.round(gap/1000)} seconds before next email...`);
          await sleep(gap);
        }

      } catch (error) {
        logger.error(`❌ ERROR: Email failed to send for Lead ${leadId} (${email}): ${error.message}`);
        
        // Optional: Update lead status so you can track failures in Prisma Studio
        await prisma.lead.update({
          where: { id: leadId },
          data: { status: 'SENDING_FAILED' }
        }).catch(() => {}); // Avoid failing the failure block

        throw error; // Still throw so BullMQ can handle retries
      }
    },
    {
      connection: redis,
      concurrency: 1 // One by one to avoid getting flagged as spam
    }
  );

  worker.on('completed', (job) => {
    logger.info(`Mail Job ${job.id} completed!`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`Mail Job ${job.id} failed: ${err.message}`);
  });

  logger.info('🚀 Mail Sending Worker started and ready for jobs.');
  return worker;
};

module.exports = {
  startMailWorker
};

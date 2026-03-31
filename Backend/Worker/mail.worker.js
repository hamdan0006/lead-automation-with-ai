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
    async (job, token) => {
      const { leadId, email, leadName } = job.data;

      if (!email) {
        logger.warn(`Job ${job.id}: No email provided for lead ${leadId}`);
        return;
      }

      // --- GMAIL DAILY SAFETY CHECK ---
      const today = new Date().toISOString().split('T')[0];
      const dailyKey = `mail_sent_daily:${today}`;
      const dailyLimit = 85; // 🛑 Updated to 85 (Total across Outreach + Follow-ups)
      
      const currentSentToday = await redis.get(dailyKey).then(v => parseInt(v) || 0);
      
      if (currentSentToday >= dailyLimit) {
        // Calculate delay until tomorrow at 6:00 PM PKT (Local)
        const now = new Date();
        const next6PM = new Date();
        next6PM.setHours(18, 0, 0, 0); // 6:00 PM
        
        // If it's already past 6 PM today, move to tomorrow 6 PM
        if (now >= next6PM) {
          next6PM.setDate(next6PM.getDate() + 1);
        }
        
        const delayMs = next6PM.getTime() - now.getTime();
        const waitHours = Math.round(delayMs / 3600000);

        logger.warn(`🛑 Quota reached (${dailyLimit}). Auto-delaying lead #${leadId} to tomorrow at 6:00 PM PKT (Waiting ~${waitHours}h).`);
        
        // Push the job back to the delayed queue
        await job.moveToDelayed(Date.now() + delayMs, token);
        return; 
      }

      logger.info(`📧 Sending email to lead ${leadId}: ${email} (Today: ${currentSentToday + 1}/${dailyLimit})`);

      try {
        // Fetch full lead data to get company/name
        const lead = await prisma.lead.findUnique({ where: { id: leadId } });

        if (!lead) {
          logger.error(`Lead ${leadId} not found in database.`);
          return;
        }

        // --- CORE STATUS VALIDATION (Smooth State Machine) ---
        
        // 1. General Blockers
        if (lead.receivedReply || lead.status === 'REPLIED' || lead.status === 'STOPPED') {
          logger.info(`🚫 Skipping lead ${leadId} (${email}): Status is ${lead.status} or reply already received.`);
          return;
        }

        if (lead.status === 'FOLLOWED_UP') {
          logger.info(`🚫 Skipping lead ${leadId}: Outreach campaign already completed (FOLLOWED_UP).`);
          return;
        }

        // 2. Initial Outreach Validation
        if (!job.data.isFollowUp) {
          if (lead.status !== 'QUEUED') {
            logger.warn(`🚫 Skipping outreach for lead ${leadId}: Expected status 'QUEUED', but found '${lead.status}'.`);
            return;
          }
        }

        // 3. Follow-up Validation
        if (job.data.isFollowUp) {
          if (lead.status !== 'CONTACTED' || !lead.contacted) {
            logger.warn(`🚫 Skipping follow-up for lead ${leadId}: Lead must be 'CONTACTED' before follow-up, current status: '${lead.status}'.`);
            return;
          }
          if (lead.followUp === false) {
             logger.info(`🚫 Skipping follow-up for lead ${leadId}: Follow-up is disabled in database.`);
             return;
          }
        }

        // Check for insecure website (http instead of https)
        const isInsecure = lead.website && lead.website.startsWith('http://');

        // Generate AI Content (Dynamic Subject + Body)
        let aiResult = null;
        logger.info(`🤖 Generating AI email for lead ${leadId} (${job.data.isFollowUp ? 'Follow-up' : 'Outreach'}) ${isInsecure ? '[INSECURE SITE ALERT]' : ''}`);

        if (job.data.isFollowUp) {
          aiResult = await generateFollowUpBody(lead);
        } else {
          aiResult = await generateOutreachBody(lead);
        }

        // 1. Send the email with the full lead data, AI content, and dynamic subject
        await sendEmail(email, lead, aiResult.body, job.data.isFollowUp || false, aiResult.subject);

        // 🟢 Success! Increment the daily counter in Redis
        await redis.incr(dailyKey);
        // Ensure key expires after 2 days to keep Redis clean
        await redis.expire(dailyKey, 172800);

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

        // 🔔 Check for Batch Outreach Completion (Only for Initial Outreach)
        if (!job.data.isFollowUp && lead.scrapingJobId) {
          const remainingOutreach = await prisma.lead.count({
            where: {
              scrapingJobId: lead.scrapingJobId,
              status: 'QUEUED' // Leads still waiting in the outreach queue
            }
          });

          if (remainingOutreach === 0) {
            const totalLeads = await prisma.lead.count({
                where: { scrapingJobId: lead.scrapingJobId, email: { not: null } }
            });

            logger.info(`🎉 Outreach process for Job #${lead.scrapingJobId} is COMPLETED!`);

            const { sendNotificationEmail } = require('../Services/mail.service');
            await sendNotificationEmail(
              `Outreach Job #${lead.scrapingJobId} Completed!`,
              `The initial AI outreach campaign for Job #${lead.scrapingJobId} has finished.\n\n🎯 Total Leads Emailed: ${totalLeads}\n🚀 Next: Follow-ups are automatically scheduled for 3 days from now.`
            ).catch(err => logger.warn(`⚠️ Failed to send outreach notification: ${err.message}`));
          }
        }

        // 3. Increment session counter
        emailsSentInSession++;

        // 4. Decide on next pause
        if (emailsSentInSession >= nextLongPauseAt) {
          const pauseDuration = getRandomInt(mailerRules.longPause.min, mailerRules.longPause.max);
          logger.info(`☕ Session session finished (${emailsSentInSession} sent). Taking a human-like break for ${Math.round(pauseDuration / 60000)} minutes...`);

          await sleep(pauseDuration);

          // Reset counters
          emailsSentInSession = 0;
          nextLongPauseAt = getRandomInt(mailerRules.triggerLongPauseAfter.min, mailerRules.triggerLongPauseAfter.max);
        } else {
          // Normal gap between emails
          const gap = getRandomInt(mailerRules.delayBetweenEmails.min, mailerRules.delayBetweenEmails.max);
          logger.info(`⏳ Waiting ${Math.round(gap / 1000)} seconds before next email...`);
          await sleep(gap);
        }

      } catch (error) {
        logger.error(`❌ ERROR: Email failed to send for Lead ${leadId} (${email}): ${error.message}`);

        // Optional: Update lead status so you can track failures in Prisma Studio
        await prisma.lead.update({
          where: { id: leadId },
          data: { status: 'SENDING_FAILED' }
        }).catch(() => { }); // Avoid failing the failure block

        throw error; // Still throw so BullMQ can handle retries
      }
    },
    {
      connection: redis,
      concurrency: 1, // One by one to avoid getting flagged as spam
      lockDuration: 420000, // 👈 7 minutes (Allows recovery if worker crashes during a 5min pause)
      stalledInterval: 60000 
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

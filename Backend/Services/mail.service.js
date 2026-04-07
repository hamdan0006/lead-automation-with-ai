const { Queue } = require('bullmq');
const redis = require('../config/redis');
const logger = require('../utils/logger');
const { prisma } = require('../config/db');
const transporter = require('../config/mail');
const { generateOutreachBody, generateFollowUpBody } = require('./aiEmail.service');

/**
 * BullMQ Email Sending Queue
 */
const mailQueue = new Queue('send-email', {
  connection: redis,
});



/**
 * Add job to send email to a lead
 * @param {number} leadId 
 * @param {string} email 
 * @param {string} leadName 
 * @param {boolean} isFollowUp - Whether this is a follow-up email
 * @param {boolean} isSecondFollowUp - Whether this is the second follow-up email
 * @param {number} delayMs - Delay before sending
 */
const addSendEmailJob = async (leadId, email, leadName, isFollowUp = false, isSecondFollowUp = false, delayMs = 0) => {
  try {
    const jobSuffix = isSecondFollowUp ? '-followup2' : (isFollowUp ? '-followup' : '');
    const jobIdSuffix = isSecondFollowUp ? '-followup2' : (isFollowUp ? '-followup' : '-initial');
    
    const job = await mailQueue.add(
      `send-email-lead-${leadId}${jobSuffix}`,
      { leadId, email, leadName, isFollowUp, isSecondFollowUp },
      {
        jobId: `lead-${leadId}-email${jobIdSuffix}`, // 👈 NATIVE DEDUPLICATION
        delay: delayMs,
        priority: isFollowUp || isSecondFollowUp ? 3 : 2, // Slightly lower priority than extraction
        removeOnComplete: true,
        removeOnFail: 100
      }
    );

    logger.info(`📧 Added Lead ${leadId} to send-email queue (Job ID: ${job.id}${isFollowUp || isSecondFollowUp ? ', Delayed by ' + (delayMs/86400000) + 'd' : ''})`);
    return job;

  } catch (error) {
    logger.error(`❌ Failed to enqueue email for lead ${leadId}: ${error.message}`);
    throw error;
  }
};

/**
 * Handle individual mailing logic
 * @param {string} to 
 * @param {object} leadData - full lead object (or null for warmup)
 * @param {string} aiContent - AI generated body content 
 * @param {boolean} isFollowUp - Is this a follow up email?
 * @param {string} subjectOverride - Optional dynamic subject line
 * @param {boolean} isWarmup - Is this a warmup email?
 */
const sendEmail = async (to, leadData, aiContent, isFollowUp = false, subjectOverride = null) => {
  try {
    const bizName = leadData.name || 'Your business';
    let subject, body;

    if (subjectOverride) {
        subject = subjectOverride;
    } else if (isFollowUp) {
        subject = `${bizName}: Following up`;
    } else {
        subject = `${bizName}: Quick question`;
    }
    body = aiContent || "Hello, I wanted to reach out but an error arose generating the message. Please excuse me.";
    
    const info = await transporter.sendMail({
      from: `"Hamdan Ahmad" <${process.env.SMTP_EMAIL}>`,
      to: to,
      subject: subject,
      text: body
    });

    logger.info(`✅ Email successfully sent to ${to}: ${info.messageId}`);
    return true;

  } catch (error) {
    logger.error(`❌ Mailer Error sending to ${to}: ${error.message}`);
    throw error;
  }
};

/**
 * Bulk enqueue leads that have emails but haven't been contacted yet
 * @param {number} jobId - Optional filter by extraction job
 */
const enqueueLeadsForOutreach = async (jobId) => {
    try {
        const query = {
            where: {
                email: { not: null },
                contacted: false,
                status: { not: 'QUEUED' } // 👈 Prevent re-fetching leads already in queue
            }
        };

        if (jobId) {
            query.where.scrapingJobId = parseInt(jobId);
        }

        const leads = await prisma.lead.findMany(query);

        if (leads.length === 0) return 0;

        logger.info(`🚛 Enqueuing ${leads.length} leads for AI outreach...`);

        for (const lead of leads) {
            // MUST happen FIRST: Mark as QUEUED in DB right away to prevent worker from instantly processing it and skipping it as 'NEW'
            await prisma.lead.update({
                where: { id: lead.id },
                data: { status: 'QUEUED' }
            });

            // NOW we queue the job. The worker will see it as 'QUEUED'
            await addSendEmailJob(lead.id, lead.email, lead.name);
        }

        return leads.length;
    } catch (error) {
        logger.error(`❌ Bulk outreach enqueue failed: ${error.message}`);
        throw error;
    }
};

/**
 * Send an administrative notification email (e.g., job completion)
 * Bypasses daily limit - always sends regardless of quota
 * @param {string} subject 
 * @param {string} text 
 */
const sendNotificationEmail = async (subject, text) => {
  try {
    const to = 'hamdanahmad0006@gmail.com';

    const info = await transporter.sendMail({
      from: `"Lead Gen System" <${process.env.SMTP_EMAIL}>`,
      to,
      subject,
      text
    });

    logger.info(`✅ Notification email sent to ${to}: ${info.messageId}`);
    return true;

  } catch (error) {
    logger.error(`❌ Notification Mailer Error: ${error.message}`);
    throw error;
  }
};

module.exports = {
  mailQueue,
  addSendEmailJob,
  sendEmail,
  enqueueLeadsForOutreach,
  sendNotificationEmail
};

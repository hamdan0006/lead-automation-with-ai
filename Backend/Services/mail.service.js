const { Queue } = require('bullmq');
const redis = require('../config/redis');
const logger = require('../utils/logger');
const transporter = require('../config/mail');
const { prisma } = require('../config/db');
const path = require('path');

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
 * @param {number} delayMs - Delay before sending
 */
const addSendEmailJob = async (leadId, email, leadName, isFollowUp = false, delayMs = 0) => {
  try {
    const job = await mailQueue.add(
      `send-email-lead-${leadId}${isFollowUp ? '-followup' : ''}`,
      { leadId, email, leadName, isFollowUp },
      {
        jobId: `lead-${leadId}-email${isFollowUp ? '-followup' : '-initial'}`, // 👈 NATIVE DEDUPLICATION
        delay: delayMs,
        priority: isFollowUp ? 3 : 2, // Slightly lower priority than extraction
        removeOnComplete: true,
        removeOnFail: 100
      }
    );

    logger.info(`📧 Added Lead ${leadId} to send-email queue (Job ID: ${job.id}${isFollowUp ? ', Delayed by ' + (delayMs/86400000) + 'd' : ''})`);
    return job;

  } catch (error) {
    logger.error(`❌ Failed to enqueue email for lead ${leadId}: ${error.message}`);
    throw error;
  }
};

/**
 * Handle individual mailing logic
 * @param {string} to 
 * @param {object} leadData - full lead object
 * @param {string} aiContent - AI generated body content 
 * @param {boolean} isFollowUp - Is this a follow up email?
 */
const sendEmail = async (to, leadData, aiContent, isFollowUp = false) => {
  try {
    
    let subject, body;

    if (isFollowUp) {
        subject = `Following up, ${leadData.name || 'there'}!`;
    } else {
        subject = `Quick question regarding ${leadData.name || 'your business'}`;
    }
    body = aiContent || "Hello, I wanted to reach out but an error arose generating the message. Please excuse me.";
    
    const info = await transporter.sendMail({
      from: `"BizBuilder" <${process.env.SMTP_EMAIL}>`,
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
            await addSendEmailJob(lead.id, lead.email, lead.name);
            
            // Mark as QUEUED in DB right away to prevent double-enqueuing
            await prisma.lead.update({
                where: { id: lead.id },
                data: { status: 'QUEUED' }
            }).catch(() => {});
        }

        return leads.length;

    } catch (error) {
        logger.error(`❌ Bulk outreach enqueue failed: ${error.message}`);
        throw error;
    }
};

module.exports = {
  mailQueue,
  addSendEmailJob,
  sendEmail,
  enqueueLeadsForOutreach
};

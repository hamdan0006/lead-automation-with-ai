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
 * @param {string} email address 
 * @param {string} leadName 
 */
const addSendEmailJob = async (leadId, email, leadName) => {
  try {
    const job = await mailQueue.add(
      `send-email-lead-${leadId}`,
      { leadId, email, leadName },
      {
        priority: 2, // Slightly lower priority than extraction
        removeOnComplete: true,
        removeOnFail: 100
      }
    );

    logger.info(`📧 Added Lead ${leadId} to send-email queue (Job ID: ${job.id})`);
    return job;

  } catch (error) {
    logger.error(`❌ Failed to enqueue email for lead ${leadId}: ${error.message}`);
    throw error;
  }
};

/**
 * Handle individual mailing logic
 * @param {string} to 
 * @param {string} leadName 
 */
const sendEmail = async (to, leadName) => {
  try {
    const logoPath = path.join(__dirname, '../assets/logo.png');
    
    const info = await transporter.sendMail({
      from: `"Lead Gen Assistant" <${process.env.SMTP_EMAIL}>`,
      to: to,
      subject: `Quick Question for ${leadName}`,
      text: `Hi ${leadName},\n\nI was looking at your website and noticed you're doing some great work. I'd love to connect.\n\nBest regards,\nThe Team`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: auto;">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="cid:logo" alt="LeadGen Logo" style="width: 150px; height: auto;">
          </div>
          <p>Hi <b>${leadName}</b>,</p>
          <p>I was looking at your website and noticed you're doing some great work. I'd love to connect and see how we can help you grow.</p>
          <p>Best regards,<br>The LeadGen Team</p>
        </div>
      `,
      attachments: [{
        filename: 'logo.png',
        path: logoPath,
        cid: 'logo' // Matches the src in the img tag
      }]
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
                contacted: false
            }
        };

        if (jobId) {
            query.where.scrapingJobId = parseInt(jobId);
        }

        const leads = await prisma.lead.findMany(query);

        logger.info(`🚛 Enqueuing ${leads.length} leads for outreach...`);

        for (const lead of leads) {
            await addSendEmailJob(lead.id, lead.email, lead.name);
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

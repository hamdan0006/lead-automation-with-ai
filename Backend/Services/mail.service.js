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
 * @param {number[]} templateIds - Optional array of template IDs to pick from
 */
const addSendEmailJob = async (leadId, email, leadName, templateIds = []) => {
  try {
    const job = await mailQueue.add(
      `send-email-lead-${leadId}`,
      { leadId, email, leadName, templateIds },
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
/**
 * Compiles a template by replacing placeholders with lead data
 */
const compileTemplate = (template, data) => {
  let { subject, body } = template;
  
  // Placeholders: {{name}}, {{company}}, {{email}}
  const replacements = {
    name: data.name || 'there',
    company: data.company || 'your business',
    email: data.email || ''
  };

  Object.keys(replacements).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    subject = subject.replace(regex, replacements[key]);
    body = body.replace(regex, replacements[key]);
  });

  return { subject, body };
};

/**
 * Fetch the default template or create one if none exists
 */
const getOrCreateDefaultEmailTemplate = async () => {
  let template = await prisma.emailTemplate.findFirst({
    where: { name: 'Default Outreach' }
  });

  if (!template) {
    template = await prisma.emailTemplate.create({
      data: {
        name: 'Default Outreach',
        subject: 'Quick Question for {{name}} at {{company}}',
        body: `Hi {{name}},\n\nI was looking at your website and noticed you're doing some great work at {{company}}. I'd love to connect.\n\nBest regards,\nThe Team`
      }
    });
    logger.info('🆕 Created default email template in database.');
  }

  return template;
};

/**
 * Handle individual mailing logic
 * @param {string} to 
 * @param {object} leadData - full lead object
 * @param {number} templateId - Optional specific template ID override
 */
const sendEmail = async (to, leadData, templateId = null) => {
  try {
    const logoPath = path.join(__dirname, '../assets/logo.png');
    
    // Get and compile template
    let rawTemplate;
    
    if (templateId) {
        rawTemplate = await prisma.emailTemplate.findUnique({ where: { id: templateId } });
        if (!rawTemplate) {
            logger.warn(`Specific template ID ${templateId} not found, falling back to default.`);
            rawTemplate = await getOrCreateDefaultEmailTemplate();
        }
    } else {
        rawTemplate = await getOrCreateDefaultEmailTemplate();
    }

    const { subject, body } = compileTemplate(rawTemplate, leadData);
    
    const info = await transporter.sendMail({
      from: `"Lead Gen Assistant" <${process.env.SMTP_EMAIL}>`,
      to: to,
      subject: subject,
      text: body,
      html: `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: auto;">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="cid:logo" alt="LeadGen Logo" style="width: 150px; height: auto;">
          </div>
          <div style="padding: 20px; border: 1px solid #eee; border-radius: 8px;">
            ${body.replace(/\n/g, '<br>')}
          </div>
          <p style="font-size: 12px; color: #999; text-align: center; margin-top: 30px;">
            Best regards,<br>The LeadGen Team
          </p>
        </div>
      `,
      attachments: [{
        filename: 'logo.png',
        path: logoPath,
        cid: 'logo'
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
 * @param {number[]} templateIds - Optional array of template IDs
 */
const enqueueLeadsForOutreach = async (jobId, templateIds = []) => {
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

        logger.info(`🚛 Enqueuing ${leads.length} leads for outreach${templateIds.length > 0 ? ` (Templates: ${templateIds.join(',')})` : ''}...`);

        for (const lead of leads) {
            await addSendEmailJob(lead.id, lead.email, lead.name, templateIds);
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

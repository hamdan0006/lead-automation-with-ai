const { Queue } = require('bullmq');
const redis = require('../config/redis');
const logger = require('../utils/logger');
const { prisma } = require('../config/db');

/**
 * BullMQ Email Extraction Queue Definition
 */
const emailQueue = new Queue('email-extraction', {
  connection: redis,
});

/**
 * Add unique job to extract email for a lead
 * @param {number} leadId 
 * @param {string} websiteUrl 
 */
const addEmailExtractionJob = async (leadId, websiteUrl) => {
  try {
    const job = await emailQueue.add(
      `extract-email-lead-${leadId}`,
      { leadId, websiteUrl },
      {
        priority: 1, // Higher priority jobs can go first
        removeOnComplete: true, // Keep it clean
        removeOnFail: 100 // Keep last 100 failed jobs for debugging
      }
    );

    logger.info(`✅ Added Lead ${leadId} to queue (Job ID: ${job.id})`);
    return job;

  } catch (error) {
    logger.error(`❌ Failed to add lead ${leadId} to email queue: ${error.message}`);
    throw error;
  }
};

/**
 * Bulk enqueue leads that need enrichment for a specific batch
 * @param {number} jobId - Optional Scraping Job ID to filter enrichment
 * @returns {Promise<number>} - Number of leads enqueued
 */
const enqueueLeadsByJobId = async (jobId) => {
    try {
        const query = {
            where: {
                hasWebsite: true,
                website: { not: null },
                email: null,
                websiteVisited: false
            }
        };

        // If jobId is provided, filter leads only for that specific batch
        if (jobId) {
            query.where.scrapingJobId = parseInt(jobId);
        }

        const leads = await prisma.lead.findMany(query);

        if (leads.length === 0) {
            logger.info(`🚛 No leads found needing enrichment${jobId ? ` for job ${jobId}` : ''}.`);
            return 0;
        }

        logger.info(`🚛 Enqueuing ${leads.length} leads for enrichment${jobId ? ` from job ${jobId}` : ''}...`);

        for (const lead of leads) {
            await addEmailExtractionJob(lead.id, lead.website);
        }

        return leads.length;

    } catch (error) {
        logger.error(`❌ Bulk enqueue failed: ${error.message}`);
        throw error;
    }
};

module.exports = {
  emailQueue,
  addEmailExtractionJob,
  enqueueLeadsByJobId
};

const logger = require('../utils/logger');
const { prisma } = require('../config/db');
const axios = require('axios');

/**
 * Sync local leads to remote server
 * POST /api/sync/leads
 * Body: { serverUrl: "https://your-server.com" }
 */
const syncLeadsToServer = async (req, res) => {
  try {
    const { serverUrl, jobId } = req.body;

    if (!serverUrl) {
      return res.status(400).json({ 
        success: false, 
        message: 'serverUrl is required (e.g., https://your-server.com)' 
      });
    }

    // Get leads from local database
    const whereClause = jobId ? { scrapingJobId: parseInt(jobId) } : {};
    const leads = await prisma.lead.findMany({
      where: whereClause,
      include: {
        scrapingJob: true
      }
    });

    if (leads.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No leads found to sync'
      });
    }

    logger.info(`📤 Syncing ${leads.length} leads to ${serverUrl}...`);

    // Send leads to server in batches of 50
    const batchSize = 50;
    let synced = 0;
    let failed = 0;

    for (let i = 0; i < leads.length; i += batchSize) {
      const batch = leads.slice(i, i + batchSize);
      
      try {
        const response = await axios.post(
          `${serverUrl}/api/sync/receive`,
          { leads: batch },
          { timeout: 30000 }
        );

        if (response.data.success) {
          synced += batch.length;
          logger.info(`✅ Synced batch ${Math.floor(i / batchSize) + 1}: ${batch.length} leads`);
        }
      } catch (error) {
        failed += batch.length;
        logger.error(`❌ Failed to sync batch: ${error.message}`);
      }
    }

    res.status(200).json({
      success: true,
      message: `Sync completed: ${synced} synced, ${failed} failed`,
      synced,
      failed,
      total: leads.length
    });

  } catch (error) {
    logger.error(`❌ Sync error: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to sync leads', 
      error: error.message 
    });
  }
};

/**
 * Receive leads from remote client
 * POST /api/sync/receive
 * Body: { leads: [...] }
 */
const receiveLeads = async (req, res) => {
  try {
    const { leads } = req.body;

    if (!leads || !Array.isArray(leads)) {
      return res.status(400).json({ 
        success: false, 
        message: 'leads array is required' 
      });
    }

    logger.info(`📥 Receiving ${leads.length} leads from remote...`);

    let created = 0;
    let skipped = 0;

    for (const lead of leads) {
      try {
        // First, ensure the scraping job exists
        if (lead.scrapingJob) {
          await prisma.scrapingJob.upsert({
            where: { id: lead.scrapingJobId },
            update: {},
            create: {
              id: lead.scrapingJobId,
              query: lead.scrapingJob.query,
              leadType: lead.scrapingJob.leadType,
              status: lead.scrapingJob.status,
              createdAt: lead.scrapingJob.createdAt
            }
          });
        }

        // Create or update lead
        await prisma.lead.upsert({
          where: { uniqueKey: lead.uniqueKey },
          update: {
            name: lead.name,
            email: lead.email,
            phone: lead.phone,
            website: lead.website,
            address: lead.address,
            city: lead.city,
            state: lead.state,
            country: lead.country,
            rating: lead.rating,
            reviewCount: lead.reviewCount,
            status: lead.status,
            emailExtracted: lead.emailExtracted,
            websiteVisited: lead.websiteVisited,
            seoTitle: lead.seoTitle,
            seoDescription: lead.seoDescription,
            loadTime: lead.loadTime,
            isResponsive: lead.isResponsive
          },
          create: {
            uniqueKey: lead.uniqueKey,
            name: lead.name,
            email: lead.email,
            phone: lead.phone,
            website: lead.website,
            address: lead.address,
            city: lead.city,
            state: lead.state,
            country: lead.country,
            rating: lead.rating,
            reviewCount: lead.reviewCount,
            status: lead.status,
            leadType: lead.leadType,
            scrapingJobId: lead.scrapingJobId,
            emailExtracted: lead.emailExtracted,
            websiteVisited: lead.websiteVisited,
            seoTitle: lead.seoTitle,
            seoDescription: lead.seoDescription,
            loadTime: lead.loadTime,
            isResponsive: lead.isResponsive
          }
        });

        created++;
      } catch (error) {
        if (error.code === 'P2002') {
          skipped++;
        } else {
          logger.error(`Failed to save lead ${lead.name}: ${error.message}`);
        }
      }
    }

    logger.info(`✅ Received: ${created} created, ${skipped} skipped`);

    res.status(200).json({
      success: true,
      message: `Received ${leads.length} leads`,
      created,
      skipped
    });

  } catch (error) {
    logger.error(`❌ Receive error: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to receive leads', 
      error: error.message 
    });
  }
};

module.exports = {
  syncLeadsToServer,
  receiveLeads
};

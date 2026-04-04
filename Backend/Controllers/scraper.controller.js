const logger = require('../utils/logger');
const { prisma } = require('../config/db');
const scraperService = require('../Services/scraper.service');
const emailQueueService = require('../Services/emailQueue.service');
const mailService = require('../Services/mail.service');

const verifyPuppeteer = async (req, res) => {
  try {
    const title = await scraperService.performPuppeteerVerification();

    res.status(200).json({
      success: true,
      message: 'Puppeteer is working successfully in the backend!',
      scrapedTitle: title
    });
  } catch (error) {
    logger.error(`Puppeteer verification failed: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Puppeteer verification failed.',
      error: error.message
    });
  }
};

const triggerMapsScraper = async (req, res) => {
  try {
    const { query, leadType } = req.body;

    if (!query) {
      return res.status(400).json({ success: false, message: 'Query is required.' });
    }

    const job = await scraperService.startMapsBackgroundScraping(query, leadType);

    res.status(202).json({
      success: true,
      message: `Google Maps background scraper started successfully for query: "${query}".`,
      jobId: job.id
    });
  } catch (error) {
    logger.error(`Error starting maps scraper: ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to trigger Maps Scraper.', error: error.message });
  }
};

const triggerEmailExtraction = async (req, res) => {
  try {
    const { jobId } = req.body;
    const enqueuedCount = await emailQueueService.enqueueLeadsByJobId(jobId);

    const message = jobId
      ? `Successfully enqueued ${enqueuedCount} leads from job #${jobId} for email extraction.`
      : `Successfully enqueued ${enqueuedCount} leads for email extraction.`;

    if (jobId) {
      await prisma.scrapingJob.update({
        where: { id: parseInt(jobId) },
        data: { status: 'ENRICHING' }
      });
    }

    res.status(202).json({
      success: true,
      message,
      count: enqueuedCount
    });
  } catch (error) {
    logger.error(`Error triggering email extraction: ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to trigger email extraction.', error: error.message });
  }
};

const triggerEmailOutreach = async (req, res) => {
  try {
    const { jobId } = req.body;
    const enqueuedCount = await mailService.enqueueLeadsForOutreach(jobId);

    let message = jobId
      ? `Successfully enqueued ${enqueuedCount} leads from job #${jobId} for AI outreach.`
      : `Successfully enqueued ${enqueuedCount} leads for AI outreach.`;

    res.status(202).json({
      success: true,
      message,
      count: enqueuedCount
    });
  } catch (error) {
    logger.error(`Error triggering email outreach: ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to trigger AI email outreach.', error: error.message });
  }
};

// =======================
// Template Management
// =======================

const listTemplates = async (req, res) => {
  try {
    const templates = await prisma.emailTemplate.findMany();
    res.status(200).json({ success: true, templates });
  } catch (error) {
    logger.error(`Error listing templates: ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to list templates.' });
  }
};

const createTemplate = async (req, res) => {
  try {
    const { name, subject, body } = req.body;

    if (!name || !subject || !body) {
      return res.status(400).json({ success: false, message: 'Name, subject, and body are required.' });
    }

    const template = await prisma.emailTemplate.create({
      data: { name, subject, body }
    });

    res.status(201).json({ success: true, message: 'Template created successfully.', template });
  } catch (error) {
    logger.error(`Error creating template: ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to create template.', error: error.message });
  }
};

const updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, subject, body } = req.body;

    const template = await prisma.emailTemplate.update({
      where: { id: parseInt(id) },
      data: { name, subject, body }
    });

    res.status(200).json({ success: true, message: 'Template updated successfully.', template });
  } catch (error) {
    logger.error(`Error updating template: ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to update template.', error: error.message });
  }
};

const deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.emailTemplate.delete({
      where: { id: parseInt(id) }
    });

    res.status(200).json({ success: true, message: 'Template deleted successfully.' });
  } catch (error) {
    logger.error(`Error deleting template: ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to delete template.', error: error.message });
  }
};

const getLeadsByJobId = async (req, res) => {
  try {
    const { jobId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const { leadType, filter } = req.query;

    const skip = (page - 1) * limit;

    // Build dynamic base filter
    const whereClause = { scrapingJobId: parseInt(jobId) };
    if (leadType) {
      whereClause.leadType = leadType;
    }

    // Apply additional filters
    if (filter === 'no-email') {
      whereClause.OR = [
        { email: null },
        { email: '' }
      ];
    } else if (filter === 'contacted') {
      whereClause.status = { in: ['CONTACTED', 'FOLLOW_UP'] };
      whereClause.receivedReply = false; // Exclude replied leads
    } else if (filter === 'replied') {
      whereClause.receivedReply = true;
    }

    const [job, leads, totalCount, queuedCount, contactedCount, emailsFoundCount] = await Promise.all([
      prisma.scrapingJob.findUnique({
        where: { id: parseInt(jobId) },
        select: { status: true }
      }),
      prisma.lead.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.lead.count({
        where: whereClause
      }),
      prisma.lead.count({
        where: {
          scrapingJobId: parseInt(jobId),
          status: 'QUEUED'
        }
      }),
      prisma.lead.count({
        where: {
          scrapingJobId: parseInt(jobId),
          status: { in: ['CONTACTED', 'FOLLOW_UP', 'REPLIED'] }
        }
      }),
      prisma.lead.count({
        where: {
          scrapingJobId: parseInt(jobId),
          email: { not: null, not: '' }
        }
      })
    ]);

    res.status(200).json({
      success: true,
      jobStatus: job ? job.status : 'UNKNOWN',
      data: leads,
      pagination: {
        total: totalCount,
        queued: queuedCount,
        contacted: contactedCount,
        emailsExtracted: emailsFoundCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit)
      }
    });

  } catch (error) {
    logger.error(`Error fetching leads for job ${req.params.jobId}: ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to fetch leads.' });
  }
};

const getJobs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [jobs, totalCount] = await Promise.all([
      prisma.scrapingJob.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { leads: true }
          }
        }
      }),
      prisma.scrapingJob.count()
    ]);

    const now = new Date();
    const currentYear = now.getFullYear();

    // Calculate Granular Outreach Stats for Dynamic Charting (System-wide)
    const allRecentLeads = await prisma.lead.findMany({
      where: {
        lastEmailedAt: {
          gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        }
      },
      select: { lastEmailedAt: true }
    });

    const hourlyOutreach = new Array(24).fill(0);
    const dailyOutreach = new Array(7).fill(0);

    allRecentLeads.forEach(lead => {
      const emailDate = new Date(lead.lastEmailedAt);
      const diffMs = now.getTime() - emailDate.getTime();

      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours >= 0 && diffHours < 24) {
        hourlyOutreach[23 - diffHours]++;
      }

      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays < 7) {
        dailyOutreach[6 - diffDays]++;
      }
    });

    // Monthly Outreach Growth
    const allEmailedLeads = await prisma.lead.findMany({
      where: {
        lastEmailedAt: {
          gte: new Date(`${currentYear}-01-01`),
          lte: new Date(`${currentYear}-12-31`)
        }
      },
      select: { lastEmailedAt: true }
    });

    const monthlyOutreach = new Array(12).fill(0);
    allEmailedLeads.forEach(lead => {
      const month = new Date(lead.lastEmailedAt).getMonth();
      monthlyOutreach[month]++;
    });

    const formattedJobs = await Promise.all(jobs.map(async (job) => {
      // Get exact counts for this job
      const [
        totalLeads, 
        leadsWithEmail, 
        extractedCount, 
        outreachLeads, 
        firstLead,
        contactedToday,
        contactedWeekly,
        replyCount
      ] = await Promise.all([
        prisma.lead.count({ where: { scrapingJobId: job.id } }),
        prisma.lead.count({ where: { scrapingJobId: job.id, email: { not: null, not: '' } } }),
        prisma.lead.count({ where: { scrapingJobId: job.id, emailExtracted: true } }),
        prisma.lead.count({ where: { scrapingJobId: job.id, status: { in: ['CONTACTED', 'FOLLOW_UP', 'REPLIED'] } } }),
        prisma.lead.findFirst({ where: { scrapingJobId: job.id }, select: { city: true, state: true, country: true } }),
        prisma.lead.count({ 
          where: { 
            scrapingJobId: job.id, 
            lastEmailedAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } 
          } 
        }),
        prisma.lead.count({ 
          where: { 
            scrapingJobId: job.id, 
            lastEmailedAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } 
          } 
        }),
        prisma.lead.count({ where: { scrapingJobId: job.id, receivedReply: true } })
      ]);

      let enrichmentStatus = 'PENDING';
      if (totalLeads === 0) {
        enrichmentStatus = 'PENDING';
      } else if (extractedCount >= totalLeads) {
        enrichmentStatus = 'COMPLETED';
      } else if (extractedCount > 0 || job.status === 'ENRICHING') {
        enrichmentStatus = 'PROCESSING';
      }

      return {
        ...job,
        results: totalLeads,
        leadsWithEmail,
        contactedCount: outreachLeads,
        contactedToday,
        contactedWeekly,
        replyCount,
        replyRate: totalLeads > 0 ? Math.round((replyCount / totalLeads) * 100) : 0,
        isAutomationComplete: totalLeads > 0 && outreachLeads >= totalLeads,
        enrichmentStatus,
        emailsExtracted: leadsWithEmail,
        leads: undefined, // Clear the leads array to keep the payload light
        city: firstLead?.city || 'N/A',
        state: firstLead?.state || 'N/A',
        country: firstLead?.country || 'N/A'
      };
    }));

    res.status(200).json({
      success: true,
      jobs: formattedJobs,
      monthlyOutreach,
      hourlyOutreach,
      dailyOutreach,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit)
      }
    });

  } catch (error) {
    logger.error(`Error fetching jobs: ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to fetch jobs.' });
  }
};

const getLeadsWithoutWebsite = async (req, res) => {
  try {
    const leads = await prisma.lead.findMany({
      where: {
        OR: [
          { website: null },
          { hasWebsite: false }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({
      success: true,
      count: leads.length,
      leads
    });
  } catch (error) {
    logger.error(`Error fetching leads without website: ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to fetch leads without website.' });
  }
};

const deleteJob = async (req, res) => {
  try {
    const { jobId } = req.params;

    // Use a transaction to ensure both leads and job are deleted
    await prisma.$transaction([
      prisma.lead.deleteMany({
        where: { scrapingJobId: parseInt(jobId) }
      }),
      prisma.scrapingJob.delete({
        where: { id: parseInt(jobId) }
      })
    ]);

    res.status(200).json({ success: true, message: `Batch #${jobId} and all its leads have been deleted.` });
  } catch (error) {
    logger.error(`Error deleting job ${req.params.jobId}: ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to delete batch data. It may not exist anymore.' });
  }
};

module.exports = {
  verifyPuppeteer,
  triggerMapsScraper,
  triggerEmailExtraction,
  triggerEmailOutreach,
  listTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getLeadsByJobId,
  getJobs,
  getLeadsWithoutWebsite,
  deleteJob
};

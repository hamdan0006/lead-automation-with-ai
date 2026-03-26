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
    const { leadType } = req.query; // 👈 Extract from query

    const skip = (page - 1) * limit;

    // 👈 Build dynamic base filter
    const whereClause = { scrapingJobId: parseInt(jobId) };
    if (leadType) {
      whereClause.leadType = leadType;
    }

    const [leads, totalCount] = await Promise.all([
      prisma.lead.findMany({
        where: whereClause, // 👈 Apply base filter
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.lead.count({
        where: whereClause // 👈 Apply base filter
      })
    ]);

    res.status(200).json({
      success: true,
      data: leads,
      pagination: {
        total: totalCount,
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
    const jobs = await prisma.scrapingJob.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { leads: true }
        }
      }
    });

    const formattedJobs = jobs.map(job => ({
      ...job,
      results: job._count.leads, // Show actual leads saved instead of processed attempts
      _count: undefined // Clean up payload
    }));

    res.status(200).json({ success: true, jobs: formattedJobs });
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
  getLeadsWithoutWebsite
};

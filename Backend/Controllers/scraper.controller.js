const logger = require('../utils/logger');
const { prisma } = require('../config/db');
const scraperService = require('../Services/scraper.service');
const emailQueueService = require('../Services/emailQueue.service');
const mailService = require('../Services/mail.service');
const axios = require('axios');


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

const getAllLeads = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const search = req.query.search || '';
    
    const skip = (page - 1) * limit;
    
    const whereClause = search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } }
      ]
    } : {};

    const [leads, totalCount] = await Promise.all([
      prisma.lead.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.lead.count({ where: whereClause })
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
    logger.error(`Error fetching all leads: ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to fetch all leads.' });
  }
};

const updateLeadCustomFields = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      contacted,
      interested,
      transcriptPulled,
      transferToTechTeam,
      personalContactNumber,
      personalEmail
    } = req.body;

    const lead = await prisma.lead.update({
      where: { id: parseInt(id) },
      data: {
        contacted: contacted !== undefined ? contacted : undefined,
        interested: interested !== undefined ? interested : undefined,
        transcriptPulled: transcriptPulled !== undefined ? transcriptPulled : undefined,
        transferToTechTeam: transferToTechTeam !== undefined ? transferToTechTeam : undefined,
        personalContactNumber: personalContactNumber !== undefined ? personalContactNumber : undefined,
        personalEmail: personalEmail !== undefined ? personalEmail : undefined
      }
    });

    res.status(200).json({ success: true, message: 'Lead updated successfully.', lead });
  } catch (error) {
    logger.error(`Error updating lead ${req.params.id}: ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to update lead.' });
  }
};

const getLeadById = async (req, res) => {
  try {
    const { id } = req.params;
    const lead = await prisma.lead.findUnique({
      where: { id: parseInt(id) },
      include: { scrapingJob: { select: { id: true, status: true, leadType: true } } }
    });

    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found.' });
    }

    res.status(200).json({ success: true, lead });
  } catch (error) {
    logger.error(`Error fetching lead ${req.params.id}: ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to fetch lead.' });
  }
};

const enrichLeadWithApollo = async (req, res) => {
  try {
    const { id } = req.params;
    const lead = await prisma.lead.findUnique({ where: { id: parseInt(id) } });

    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found.' });
    }

    const apolloKey = process.env.APOLLO_API_KEY;
    if (!apolloKey) {
      return res.status(500).json({ success: false, message: 'Apollo API key not configured.' });
    }

    // ── Build domain & org name ───────────────────────────────────────────────
    let organizationDomain = null;
    let organizationName = lead.name || null;

    if (lead.website) {
      try {
        organizationDomain = new URL(
          lead.website.startsWith('http') ? lead.website : `https://${lead.website}`
        ).hostname.replace(/^www\./, '');
      } catch (_) {}
    }

    const formatPerson = (p) => ({
      name: p.name || null,
      firstName: p.first_name || null,
      lastName: p.last_name || null,
      title: p.title || null,
      email: p.email || null,
      phone: p.sanitized_phone || p.phone_numbers?.[0]?.sanitized_number || null,
      linkedinUrl: p.linkedin_url || null,
      photo: p.photo_url || null,
      city: p.city || null,
      state: p.state || null,
      country: p.country || null,
      organization: p.organization?.name || null,
      seniority: p.seniority || null,
    });

    const results = [];
    const seenNames = new Set();

    // ── STEP 1: Organization Enrich (gets key people in the company) ──────────
    // Works on free plan — returns org details + up to 5 org chart people
    if (organizationDomain || organizationName) {
      try {
        const orgParams = { api_key: apolloKey };
        if (organizationDomain) orgParams.domain = organizationDomain;
        else orgParams.name = organizationName;

        const orgRes = await axios.get('https://api.apollo.io/v1/organizations/enrich', {
          params: orgParams,
          timeout: 12000
        });

        const org = orgRes.data?.organization;
        if (org) {
          // Pull any people attached to the org record
          const orgPeople = [
            ...(org.current_technologies ? [] : []),
            ...(Array.isArray(org.people) ? org.people : []),
          ];

          for (const p of orgPeople) {
            if (p.name && !seenNames.has(p.name)) {
              seenNames.add(p.name);
              results.push(formatPerson(p));
            }
          }

          logger.info(`Apollo org enrich found ${orgPeople.length} people for: ${org.name}`);
        }
      } catch (orgErr) {
        if (!orgErr.response || orgErr.response.status !== 404) {
          logger.warn(`Apollo org enrich failed: ${orgErr.message}`);
        }
      }
    }

    // ── STEP 2: people/match for common owner titles ──────────────────────────
    // Works on free plan — searches by title + org domain or name
    const ownerTitles = ['Owner', 'CEO', 'Founder', 'Co-Founder', 'President', 'Managing Director', 'Director'];

    for (const title of ownerTitles) {
      if (results.length >= 6) break;
      try {
        const body = { api_key: apolloKey, title };
        if (organizationDomain) body.organization_domain = organizationDomain;
        else if (organizationName) body.organization_name = organizationName;
        else break;

        const matchRes = await axios.post(
          'https://api.apollo.io/v1/people/match',
          body,
          { headers: { 'Content-Type': 'application/json' }, timeout: 10000 }
        );

        const person = matchRes.data?.person;
        if (person && person.name && !seenNames.has(person.name)) {
          seenNames.add(person.name);
          results.push(formatPerson(person));
        }
      } catch (matchErr) {
        if (!matchErr.response || matchErr.response.status !== 404) {
          logger.warn(`Apollo match failed for "${title}": ${matchErr.message}`);
        }
      }
    }

    res.status(200).json({
      success: true,
      people: results,
      total: results.length,
      searchedBy: organizationDomain ? `domain: ${organizationDomain}` : `name: ${organizationName}`
    });

  } catch (error) {
    logger.error(`Apollo enrichment error for lead ${req.params.id}: ${error.message}`);
    if (error.response) {
      logger.error(`Apollo response: ${JSON.stringify(error.response.data)}`);
    }
    res.status(500).json({ success: false, message: 'Failed to enrich lead with Apollo.', error: error.message });
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
  deleteJob,
  getAllLeads,
  updateLeadCustomFields,
  getLeadById,
  enrichLeadWithApollo
};


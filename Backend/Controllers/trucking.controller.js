const logger = require('../utils/logger');
const truckingService = require('../Services/trucking.service');

/**
 * PATCH /api/trucking/leads/:leadId/contacted
 * Body: { contacted: boolean }
 */
const patchLeadContacted = async (req, res) => {
  try {
    const { leadId } = req.params;
    const { contacted } = req.body;
    if (typeof contacted !== 'boolean') {
      return res.status(400).json({ success: false, message: '`contacted` must be a boolean.' });
    }
    const lead = await truckingService.updateLeadContacted(leadId, contacted);
    res.json({ success: true, lead });
  } catch (error) {
    logger.error(`patchLeadContacted error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to update contacted status.', error: error.message });
  }
};

const MAX_DOT_RANGE = 5000;

/**
 * POST /api/trucking/fmcsa
 * Body: { fromDot: number, toDot: number }
 * Starts a background FMCSA SAFER scrape for the given DOT number range.
 */
const triggerFmcsaScraper = async (req, res) => {
  try {
    const fromDot = parseInt(req.body.fromDot);
    const toDot   = parseInt(req.body.toDot);

    if (!fromDot || !toDot) {
      return res.status(400).json({ success: false, message: 'fromDot and toDot are required.' });
    }
    if (isNaN(fromDot) || isNaN(toDot)) {
      return res.status(400).json({ success: false, message: 'fromDot and toDot must be valid numbers.' });
    }
    if (fromDot > toDot) {
      return res.status(400).json({ success: false, message: 'fromDot must be less than or equal to toDot.' });
    }
    if (toDot - fromDot > MAX_DOT_RANGE) {
      return res.status(400).json({ success: false, message: `Range cannot exceed ${MAX_DOT_RANGE} DOT numbers per job.` });
    }

    const job = await truckingService.startFmcsaScraping(fromDot, toDot);

    res.status(202).json({
      success: true,
      message: `FMCSA scraper started for USDOT ${fromDot}–${toDot}`,
      jobId: job.id,
    });
  } catch (error) {
    logger.error(`triggerFmcsaScraper error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to start FMCSA scraper.', error: error.message });
  }
};

/**
 * GET /api/trucking/jobs
 * Query: page, limit
 * Lists all TruckingJobs with pagination.
 */
const getTruckingJobs = async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 10;

    const { jobs, total } = await truckingService.getTruckingJobs(page, limit);

    res.json({
      success: true,
      jobs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error(`getTruckingJobs error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to fetch trucking jobs.', error: error.message });
  }
};

/**
 * GET /api/trucking/jobs/:jobId/leads
 * Query: page, limit
 * Returns paginated leads for a TruckingJob.
 */
const getTruckingLeads = async (req, res) => {
  try {
    const { jobId } = req.params;
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 50;

    const { leads, total } = await truckingService.getTruckingLeads(jobId, page, limit);

    res.json({
      success: true,
      leads,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error(`getTruckingLeads error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to fetch trucking leads.', error: error.message });
  }
};

/**
 * DELETE /api/trucking/jobs/:jobId
 * Deletes a TruckingJob and all its leads.
 */
const deleteTruckingJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    await truckingService.deleteTruckingJob(jobId);
    res.json({ success: true, message: `Trucking job #${jobId} and its leads deleted.` });
  } catch (error) {
    logger.error(`deleteTruckingJob error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to delete trucking job.', error: error.message });
  }
};
/**
 * GET /api/trucking/all-leads
 * Returns all trucking leads for export.
 */
const getAllTruckingLeadsExport = async (req, res) => {
  try {
    const leads = await truckingService.getAllTruckingLeadsForExport();
    res.json({ success: true, leads });
  } catch (error) {
    logger.error(`getAllTruckingLeadsExport error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to fetch all trucking leads.', error: error.message });
  }
};

module.exports = { triggerFmcsaScraper, getTruckingJobs, getTruckingLeads, deleteTruckingJob, getAllTruckingLeadsExport, patchLeadContacted };

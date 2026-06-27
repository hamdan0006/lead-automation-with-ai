const express = require('express');
const router = express.Router();
const {
  triggerFmcsaScraper,
  getTruckingJobs,
  getTruckingLeads,
  deleteTruckingJob,
  getAllTruckingLeadsExport,
  patchLeadContacted,
} = require('../Controllers/trucking.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

router.use(verifyToken);

// GET    /api/trucking/all-leads            — get all leads for export
router.get('/all-leads', getAllTruckingLeadsExport);

// POST   /api/trucking/fmcsa               — start a new FMCSA scrape job
router.post('/fmcsa', triggerFmcsaScraper);

// GET    /api/trucking/jobs                 — list all trucking jobs
router.get('/jobs', getTruckingJobs);

// GET    /api/trucking/jobs/:jobId/leads    — get leads for a job
router.get('/jobs/:jobId/leads', getTruckingLeads);

// DELETE /api/trucking/jobs/:jobId          — delete job + its leads
router.delete('/jobs/:jobId', deleteTruckingJob);

// PATCH  /api/trucking/leads/:leadId/contacted — toggle contacted flag
router.patch('/leads/:leadId/contacted', patchLeadContacted);

module.exports = router;

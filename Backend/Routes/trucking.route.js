const express = require('express');
const router = express.Router();
const {
  triggerFmcsaScraper,
  getTruckingJobs,
  getTruckingLeads,
  deleteTruckingJob,
} = require('../Controllers/trucking.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

router.use(verifyToken);

// POST   /api/trucking/fmcsa               — start a new FMCSA scrape job
router.post('/fmcsa', triggerFmcsaScraper);

// GET    /api/trucking/jobs                 — list all trucking jobs
router.get('/jobs', getTruckingJobs);

// GET    /api/trucking/jobs/:jobId/leads    — get leads for a job
router.get('/jobs/:jobId/leads', getTruckingLeads);

// DELETE /api/trucking/jobs/:jobId          — delete job + its leads
router.delete('/jobs/:jobId', deleteTruckingJob);

module.exports = router;

const express = require('express');
const router = express.Router();
const { 
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
} = require('../Controllers/scraper.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

// Protect all /scraper routes with authentication
router.use(verifyToken);

// GET /scraper/verify
router.get('/verify', verifyPuppeteer);

// POST /scraper/google-maps
router.post('/google-maps', triggerMapsScraper);

// POST /scraper/extract-emails
router.post('/extract-emails', triggerEmailExtraction);

// POST /scraper/send-emails
router.post('/send-emails', triggerEmailOutreach);

// Template Management
router.get('/templates', listTemplates);
router.post('/templates', createTemplate);
router.put('/templates/:id', updateTemplate);
router.delete('/templates/:id', deleteTemplate);

// GET /scraper/jobs/:jobId/leads
router.get('/jobs/:jobId/leads', getLeadsByJobId);

// GET /scraper/jobs
router.get('/jobs', getJobs);

// DELETE /scraper/jobs/:jobId
router.delete('/jobs/:jobId', deleteJob);

// GET /scraper/no-website
router.get('/no-website', getLeadsWithoutWebsite);

// GET /scraper/all-leads
router.get('/all-leads', getAllLeads);

// PUT /scraper/leads/:id/custom-fields
router.put('/leads/:id/custom-fields', updateLeadCustomFields);

// GET /scraper/leads/:id
router.get('/leads/:id', getLeadById);

// POST /scraper/leads/:id/apollo-enrich
router.post('/leads/:id/apollo-enrich', enrichLeadWithApollo);

module.exports = router;

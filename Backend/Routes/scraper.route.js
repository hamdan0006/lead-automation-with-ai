const express = require('express');
const router = express.Router();
const { verifyPuppeteer, triggerMapsScraper, triggerEmailExtraction, triggerEmailOutreach } = require('../Controllers/scraper.controller');

// GET /scraper/verify
router.get('/verify', verifyPuppeteer);

// POST /scraper/google-maps
router.post('/google-maps', triggerMapsScraper);

// POST /scraper/extract-emails
router.post('/extract-emails', triggerEmailExtraction);

// POST /scraper/send-emails
router.post('/send-emails', triggerEmailOutreach);

module.exports = router;

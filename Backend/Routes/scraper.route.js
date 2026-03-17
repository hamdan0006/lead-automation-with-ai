const express = require('express');
const router = express.Router();
const { verifyPuppeteer, triggerMapsScraper } = require('../Controllers/scraper.controller');

// GET /scraper/verify
router.get('/verify', verifyPuppeteer);

// POST /scraper/google-maps
router.post('/google-maps', triggerMapsScraper);

module.exports = router;

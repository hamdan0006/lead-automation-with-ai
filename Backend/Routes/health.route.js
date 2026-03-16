const express = require('express');
const router = express.Router();
const HealthController = require('../Controllers/health.controller');

// Map HTTP routes to specific controller methods
router.get('/', HealthController.getHealth);

module.exports = router;

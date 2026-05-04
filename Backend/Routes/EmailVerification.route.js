const express = require('express');
const router = express.Router();
const { verifyEmailController } = require('../Controllers/EmailVerification.controller');

/**
 * POST /api/email-verification/verify
 *
 * Accepts: { "email": "someone@example.com" }
 * Returns: { success, data: { email, status, health, checks, reason } }
 */
router.post('/verify', verifyEmailController);

module.exports = router;

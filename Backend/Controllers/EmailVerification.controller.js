const { verifyEmail } = require('../Services/EmailVerification.service');
const logger = require('../utils/logger');

/**
 * POST /api/email-verification/verify
 *
 * Body:  { "email": "someone@example.com" }
 *
 * Response (5 fields):
 *  {
 *    email:   string   — the normalised email that was checked
 *    status:  string   — deliverable | risky | undeliverable | unknown
 *    health:  string   — healthy | acceptable | risky | unknown | bad
 *    checks:  object   — granular per-stage boolean/string flags
 *    reason:  string?  — human-readable explanation of the verdict
 *  }
 */
async function verifyEmailController(req, res) {
  const { email } = req.body;

  // ── Input guard ──────────────────────────────────────────
  if (!email || typeof email !== 'string' || !email.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Request body must contain a non-empty "email" field.',
    });
  }

  logger.info(`[EmailVerification] Verifying: ${email.trim()}`);

  try {
    const result = await verifyEmail(email);

    // Return exactly the 5 documented fields
    return res.status(200).json({
      success: true,
      data: {
        email:   result.email,
        status:  result.status,
        health:  result.health,
        checks:  result.checks,
        reason:  result.reason,
      },
    });
  } catch (error) {
    logger.error(`[EmailVerification] Unexpected error for "${email}": ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during email verification.',
      error: error.message,
    });
  }
}

module.exports = { verifyEmailController };

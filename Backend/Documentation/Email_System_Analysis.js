/**
 * EMAIL SENDING SYSTEM - COMPLETE ANALYSIS
 * Route: POST /scraper/send-emails (triggerEmailOutreach)
 * 
 * This document maps ALL scenarios and channels in your email system
 */

// ============================================================================
// FLOW OVERVIEW
// ============================================================================

/**
 * STEP 1: API Call
 * POST /scraper/send-emails
 * Body: { jobId: 123 } (optional - if not provided, sends to ALL leads with emails)
 * 
 * STEP 2: Controller (scraper.controller.js)
 * - Calls: mailService.enqueueLeadsForOutreach(jobId)
 * - Returns: 202 Accepted with count of enqueued leads
 * 
 * STEP 3: Mail Service (mail.service.js)
 * - Finds leads: email NOT NULL, contacted = false, status != 'QUEUED'
 * - Marks each lead as status = 'QUEUED' in DB
 * - Adds each lead to BullMQ 'send-email' queue
 * 
 * STEP 4: Mail Worker (mail.worker.js)
 * - Processes queue one-by-one (concurrency: 1)
 * - Checks daily limit (85 emails/day)
 * - Validates lead status
 * - Generates AI email
 * - Sends email via SMTP
 * - Updates lead status
 * - Schedules follow-up (3 days later)
 */

// ============================================================================
// CHANNEL 1: COMPANY EMAIL (Primary Channel)
// ============================================================================

/**
 * SOURCE: Leads with company email found during email extraction
 * 
 * CHARACTERISTICS:
 * - Email domain matches company website (e.g., john@acmecorp.com)
 * - Higher deliverability and trust
 * - More likely to reach decision maker
 * 
 * FLOW:
 * 1. Email extracted from website (email.scraper.js)
 * 2. Stored in lead.email field
 * 3. Ranked by AI (personal emails ranked higher than info@)
 * 4. Sent via SMTP (mail.worker.js)
 * 
 * EXAMPLE:
 * Lead: "Acme Restaurant"
 * Website: https://acmerestaurant.com
 * Email found: owner@acmerestaurant.com
 * Channel: Company Email 
 */

// ============================================================================
// CHANNEL 2: GENERIC EMAIL (Secondary Channel)
// ============================================================================

/**
 * SOURCE: Generic emails found on website
 * 
 * CHARACTERISTICS:
 * - info@, contact@, hello@, support@, office@
 * - Lower priority (ranked lower by AI)
 * - May go to receptionist/assistant
 * 
 * FLOW:
 * Same as Channel 1, but ranked lower by AI
 * 
 * EXAMPLE:
 * Lead: "Acme Restaurant"
 * Email found: info@acmerestaurant.com
 * Channel: Generic Company Email ⚠️
 */

// ============================================================================
// CHANNEL 3: PERSONAL EMAIL (Gmail/Yahoo/Hotmail)
// ============================================================================

/**
 * SOURCE: Personal emails found on website
 * 
 * CHARACTERISTICS:
 * - @gmail.com, @yahoo.com, @hotmail.com, @outlook.com
 * - Often owner's personal email (small businesses)
 * - Good for small businesses, less professional for large ones
 * 
 * FLOW:
 * Same as Channel 1
 * 
 * EXAMPLE:
 * Lead: "Joe's Plumbing"
 * Email found: joeplumber123@gmail.com
 * Channel: Personal Email ✅ (Good for small business)
 */

// ============================================================================
// CHANNEL 4: FOLLOW-UP EMAIL (Automated)
// ============================================================================

/**
 * SOURCE: Automatically scheduled 3 days after initial email
 * 
 * CHARACTERISTICS:
 * - Same email address as initial outreach
 * - Different subject/body (follow-up template)
 * - Only sent if no reply received
 * 
 * FLOW:
 * 1. Initial email sent → status = 'CONTACTED'
 * 2. Follow-up scheduled with 3-day delay
 * 3. After 3 days, worker processes follow-up job
 * 4. Checks: lead.status === 'CONTACTED' && !lead.receivedReply
 * 5. Sends follow-up → status = 'FOLLOWED_UP'
 * 
 * EXAMPLE:
 * Day 1: Initial email sent to owner@acme.com
 * Day 4: Follow-up sent to owner@acme.com (if no reply)
 */

// ============================================================================
// SCENARIO BREAKDOWN (11 Scenarios)
// ============================================================================

/**
 * AI detects scenario based on lead data and generates appropriate email
 * 
 * SCENARIO 1: NO_WEBSITE
 * - Trigger: lead.website is null or empty
 * - Subject: "{Business} — customers in {city} can't find you online"
 * - Pitch: Build them a website
 * 
 * SCENARIO 2: WEBSITE_DOWN
 * - Trigger: seoTitle includes "Unreachable" or "Error"
 * - Subject: "{Business} — your website is down right now"
 * - Pitch: Fix their broken website urgently
 * 
 * SCENARIO 3: INSECURE (HTTP)
 * - Trigger: website starts with "http://" (not https)
 * - Subject: "{Business} — visitors see a warning before they see your business"
 * - Pitch: Add SSL certificate
 * 
 * SCENARIO 4: BAD_SEO
 * - Trigger: seoTitle doesn't include business name OR missing seoDescription
 * - Subject: "{Business} — Google is sending your customers elsewhere"
 * - Pitch: Fix SEO to rank in local searches
 * 
 * SCENARIO 5: SLOW_LOAD
 * - Trigger: loadTime > 4.5 seconds
 * - Subject: "{Business} — your site is losing visitors to load time"
 * - Pitch: Speed optimization
 * 
 * SCENARIO 6: MOBILE (Not Responsive)
 * - Trigger: isResponsive === false
 * - Subject: "{Business} — mobile visitors are having a hard time"
 * - Pitch: Make site mobile-friendly
 * 
 * SCENARIO 7: INSECURE_ALL (Triple Threat)
 * - Trigger: HTTP + Bad SEO + Slow Load
 * - Subject: "{Business} — three things quietly costing you customers"
 * - Pitch: Fix all three issues
 * 
 * SCENARIO 8: SEO_AND_SPEED
 * - Trigger: Bad SEO + Slow Load
 * - Subject: "{Business} — two things sending customers to competitors"
 * - Pitch: Fix SEO and speed
 * 
 * SCENARIO 9: INSECURE_SEO
 * - Trigger: HTTP + Bad SEO
 * - Subject: "{Business} — visitors don't trust it and Google can't find it"
 * - Pitch: Fix security and SEO
 * 
 * SCENARIO 10: INSECURE_SLOW
 * - Trigger: HTTP + Slow Load
 * - Subject: "{Business} — visitors are leaving before they see your business"
 * - Pitch: Fix security and speed
 * 
 * SCENARIO 11: AUTOMATION (Default/Healthy Site)
 * - Trigger: None of the above (site is healthy)
 * - Subject: "{Business} — your online presence is solid, here's what's next"
 * - Pitch: Automation and lead generation system
 */

// ============================================================================
// EMAIL SENDING RULES & LIMITS
// ============================================================================

/**
 * DAILY LIMIT: 85 emails/day (Gmail limit safety)
 * - Includes both initial outreach + follow-ups
 * - Tracked in Redis: mail_sent_daily:{date}
 * - If limit reached: Jobs delayed to next day 6:00 PM PKT
 * 
 * TIMING RULES (Human-like behavior):
 * - Delay between emails: 3-5.5 minutes (180-330 seconds)
 * - After 10-20 emails: "Coffee break" of 10-20 minutes
 * - Concurrency: 1 (one email at a time)
 * 
 * SMTP CONFIG:
 * - From: "Hamdan Ahmad" <{SMTP_EMAIL}>
 * - Provider: Gmail SMTP (smtp.gmail.com:587)
 * - Authentication: App Password
 */

// ============================================================================
// STATUS STATE MACHINE
// ============================================================================

/**
 * Lead Status Flow:
 * 
 * NEW (default)
 *   ↓
 * QUEUED (when added to email queue)
 *   ↓
 * CONTACTED (after initial email sent)
 *   ↓
 * FOLLOWED_UP (after follow-up sent)
 *   ↓
 * REPLIED (if customer replies) → STOPS HERE
 * 
 * Alternative paths:
 * - SENDING_FAILED (if email fails)
 * - STOPPED (manually stopped by user)
 */

// ============================================================================
// VALIDATION CHECKS (Before Sending)
// ============================================================================

/**
 * BLOCKER 1: Daily Limit
 * - Check: Redis counter > 85
 * - Action: Delay job to tomorrow 6 PM
 * 
 * BLOCKER 2: Already Replied
 * - Check: lead.receivedReply === true OR lead.status === 'REPLIED'
 * - Action: Skip (don't send)
 * 
 * BLOCKER 3: Already Completed
 * - Check: lead.status === 'FOLLOWED_UP'
 * - Action: Skip (campaign complete)
 * 
 * BLOCKER 4: Manually Stopped
 * - Check: lead.status === 'STOPPED'
 * - Action: Skip
 * 
 * BLOCKER 5: Wrong Status for Initial Email
 * - Check: !isFollowUp && lead.status !== 'QUEUED'
 * - Action: Skip (status mismatch)
 * 
 * BLOCKER 6: Wrong Status for Follow-up
 * - Check: isFollowUp && (lead.status !== 'CONTACTED' || !lead.contacted)
 * - Action: Skip (not ready for follow-up)
 * 
 * BLOCKER 7: Follow-up Disabled
 * - Check: isFollowUp && lead.followUp === false
 * - Action: Skip (follow-up disabled in DB)
 */

// ============================================================================
// AI EMAIL GENERATION
// ============================================================================

/**
 * PROVIDER: OpenRouter (meta-llama/llama-3.3-70b-instruct)
 * 
 * PRIMARY KEY: process.env.Nvidia_super3 || process.env.Llama_KEY
 * FALLBACK KEY: process.env.Llama_KEY
 * 
 * PROCESS:
 * 1. Detect scenario based on lead data
 * 2. Get template for scenario
 * 3. Send template to AI with prompt to rephrase (5-10% word changes)
 * 4. AI returns JSON: { subject: "...", body: "..." }
 * 5. Polish body (add signature, format line breaks)
 * 6. Return to worker for sending
 * 
 * FALLBACK: If AI fails, use raw template
 */

// ============================================================================
// EMAIL RANKING (AI-Powered)
// ============================================================================

/**
 * When multiple emails found for one lead:
 * 
 * RANKING PRIORITY (High to Low):
 * 1. Personal name emails (john@company.com, j.smith@company.com)
 * 2. Business domain emails (@company.com)
 * 3. Personal provider emails (@gmail.com, @yahoo.com)
 * 4. Generic inboxes (info@, contact@, office@, reception@)
 * 
 * AI ranks them and returns best email first
 */

// ============================================================================
// NOTIFICATION SYSTEM
// ============================================================================

/**
 * ADMIN NOTIFICATIONS (Sent to hamdanahmad0006@gmail.com):
 * 
 * 1. Scraping Job Completed
 *    - Trigger: Maps scraper finishes
 *    - Content: Query, new leads count, cycles used
 * 
 * 2. Outreach Campaign Completed
 *    - Trigger: Last lead in batch reaches 'CONTACTED' status
 *    - Content: Job ID, total leads emailed
 *    - Uses Redis lock to prevent duplicate notifications
 * 
 * These bypass the 85/day limit (always sent)
 */

// ============================================================================
// EDGE CASES & HANDLING
// ============================================================================

/**
 * CASE 1: No Email Found
 * - Lead has no email field
 * - Never added to email queue
 * - Stays in status 'NEW'
 * 
 * CASE 2: Email Extraction Failed
 * - lead.emailExtracted = false
 * - Can be re-queued for extraction
 * 
 * CASE 3: Customer Replies
 * - Detected by reply.worker.js (IMAP monitoring)
 * - Sets lead.receivedReply = true, status = 'REPLIED'
 * - Stops all future emails (initial + follow-up)
 * 
 * CASE 4: Duplicate Job Submission
 * - BullMQ uses jobId for deduplication
 * - Format: "lead-{leadId}-email-initial" or "lead-{leadId}-email-followup"
 * - Prevents duplicate emails to same lead
 * 
 * CASE 5: Job Deleted During Campaign
 * - Foreign key constraint error
 * - Worker catches error and stops gracefully
 * 
 * CASE 6: SMTP Failure
 * - Worker catches error
 * - Sets lead.status = 'SENDING_FAILED'
 * - BullMQ retries job (default retry logic)
 */

// ============================================================================
// SUMMARY: ALL CHANNELS
// ============================================================================

/**
 * CHANNEL SUMMARY:
 * 
 * 1. Company Email (Primary)
 *    - owner@company.com, john@company.com
 *    - Best deliverability
 *    - Highest conversion
 * 
 * 2. Generic Company Email (Secondary)
 *    - info@company.com, contact@company.com
 *    - Lower priority
 *    - May reach receptionist
 * 
 * 3. Personal Email (Gmail/Yahoo)
 *    - john@gmail.com
 *    - Good for small businesses
 *    - Owner's personal inbox
 * 
 * 4. Follow-up Email (Automated)
 *    - Same address as initial
 *    - 3 days after initial
 *    - Different template
 * 
 * ALL channels use:
 * - Same SMTP (Gmail)
 * - Same daily limit (85)
 * - Same timing rules (3-5.5 min gaps)
 * - Same AI generation
 * - Same validation checks
 */

// ============================================================================
// POTENTIAL IMPROVEMENTS
// ============================================================================

/**
 * CURRENT GAPS:
 * 
 * 1. No LinkedIn outreach channel
 * 2. No phone call tracking
 * 3. No SMS channel
 * 4. No second follow-up (only 1 follow-up currently)
 * 5. No A/B testing of email templates
 * 6. No time-of-day optimization (sends anytime)
 * 7. No timezone awareness (all times in PKT)
 * 
 * POTENTIAL ADDITIONS:
 * 
 * 1. Multi-channel sequences:
 *    Day 1: Email
 *    Day 4: Follow-up email
 *    Day 7: LinkedIn message
 *    Day 10: Phone call
 * 
 * 2. Smart send times:
 *    - Send during business hours in lead's timezone
 *    - Avoid weekends
 *    - Optimize for open rates
 * 
 * 3. Multiple follow-ups:
 *    - Follow-up 1: Day 3
 *    - Follow-up 2: Day 7
 *    - Follow-up 3: Day 14
 * 
 * 4. Email warmup:
 *    - Send to known addresses first
 *    - Gradually increase volume
 *    - Build sender reputation
 */

module.exports = {
  // This is a documentation file
  // No exports needed
};

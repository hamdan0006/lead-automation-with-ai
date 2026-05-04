Email Verification Pipeline
Stage 1: Syntax Validation

Check RFC 5322 compliance (basic format rules)
Validate special characters, dots placement, @ symbol
Check length limits (local part max 64 chars, domain max 255 chars)
Reject if fails

Stage 2: DNS/Domain Checks

Check if domain exists (DNS A record lookup)
Verify domain has MX records configured
If no MX records, check A record (some small servers accept mail directly)
Get list of mail servers from MX records (sorted by priority)
Reject if no MX and no A record

Stage 3: SMTP Validation (The Critical Part)

Connect to SMTP server on port 25
Send EHLO/HELO command
Send MAIL FROM with your sending address
Send RCPT TO with the email you're verifying
Check server response:

250 = accepts, mailbox exists
550/551/553 = mailbox doesn't exist, reject
450/451/452 = temporary issue, mark as "unknown"
550 5.1.1 = user unknown, reject


IMPORTANT: Disconnect BEFORE sending DATA or actual email (you're just checking, not sending)

Stage 4: Additional Risk Checks

Check if domain is catch-all (accepts everything) - these are risky
Detect disposable/temporary email services (mailinator, guerrilla mail, etc.) - maintain a blacklist
Check if it's a role-based email (info@, admin@, noreply@) - lower engagement
Verify domain age (newly registered domains = higher risk)
Check domain against spam/blacklist databases

Stage 5: Greylisting Detection

Some servers temporarily reject first connection (greylisting)
If you get 450/451/452 codes, retry after 5-15 minutes
This separates real servers from spammers




SEND to anything marked deliverable.
SEND to anything marked risky IF the domain is a real company and the email is a professional name (like firstname@company.com).
DELETE anything marked undeliverable.
DELETE anything that is risky but from a weird/unknown domain.
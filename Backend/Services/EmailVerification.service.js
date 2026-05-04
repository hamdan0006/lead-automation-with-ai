const dns = require('dns').promises;
const net = require('net');
const logger = require('../utils/logger');
const { validateWithThirdParty } = require('./thirdPartyValidator.service');

// ─────────────────────────────────────────────
// Disposable email domains blacklist
// ─────────────────────────────────────────────
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', 'guerrillamail.com', 'guerrillamail.net', 'guerrillamail.org',
  'tempmail.com', 'temp-mail.org', 'throwam.com', 'throwam.net',
  'yopmail.com', 'maildrop.cc', 'sharklasers.com', 'guerrillamailblock.com',
  'grr.la', 'guerrillamail.info', 'spam4.me', 'trashmail.com', 'trashmail.at',
  'trashmail.io', 'trashmail.me', 'dispostable.com', 'mailnull.com',
  'spamgourmet.com', 'fakeinbox.com', 'getonemail.com', 'mailexpire.com',
  'discard.email', 'discardmail.com', 'spambox.us', 'filzmail.com',
  'gishpuppy.com', 'mytrashmail.com', 'nowmymail.com', 'spamhere.eu',
  'tempr.email', 'spamex.com', 'spamfree24.org', '10minutemail.com',
  '10minutemail.net', 'minutemail.com', 'mailnesia.com', 'boun.cr',
  'spamthisplease.com', 'wegwerfemail.de', 'throwam.com', 'eelmail.com',
]);

// ─────────────────────────────────────────────
// Trusted CONSUMER email domains — these providers block port-25
// probing by design. ONLY applies when the email domain itself is one
// of these well-known consumer services.
//
// ⚠️  IMPORTANT: Custom business domains (e.g. shannon@sociallivingre.com)
// that merely HOST on Google Workspace / Microsoft 365 are NOT in this
// list. Their mailboxes can be non-existent and must be SMTP-probed.
// ─────────────────────────────────────────────
const TRUSTED_CONSUMER_DOMAINS = new Set([
  // Google / Gmail (personal)
  'gmail.com', 'googlemail.com',
  // Microsoft consumer services
  'outlook.com', 'hotmail.com', 'hotmail.co.uk', 'hotmail.fr',
  'live.com', 'live.co.uk', 'live.fr', 'live.nl', 'live.ca',
  'msn.com', 'windowslive.com',
  // Yahoo and subsidiaries
  'yahoo.com', 'yahoo.co.uk', 'yahoo.co.in', 'yahoo.fr',
  'yahoo.de', 'yahoo.es', 'yahoo.it', 'yahoo.ca',
  'ymail.com', 'rocketmail.com',
  // Apple iCloud
  'icloud.com', 'me.com', 'mac.com',
  // ProtonMail
  'protonmail.com', 'protonmail.ch', 'proton.me', 'pm.me',
  // Zoho (personal / free tier)
  'zohomail.com',
  // GMX
  'gmx.com', 'gmx.net', 'gmx.de', 'gmx.at', 'gmx.ch',
  // FastMail
  'fastmail.com', 'fastmail.fm', 'fastmail.to', 'fastmail.org',
  // AOL / Verizon Media
  'aol.com', 'aim.com',
  // Other common free providers
  'mail.com', 'email.com',
]);

/**
 * Returns true ONLY when the email's own domain is a known consumer
 * mail service. Custom business domains (even on Google/MS infra) return false.
 *
 * @param {string} emailDomain  — the part after @, already lowercased
 */
function isTrustedConsumerDomain(emailDomain) {
  return TRUSTED_CONSUMER_DOMAINS.has(emailDomain);
}

// ─────────────────────────────────────────────
// Role-based local-part prefixes
// ─────────────────────────────────────────────
const ROLE_BASED_PREFIXES = new Set([
  'info', 'admin', 'administrator', 'noreply', 'no-reply', 'support',
  'help', 'helpdesk', 'contact', 'sales', 'marketing', 'billing',
  'abuse', 'postmaster', 'webmaster', 'hostmaster', 'mailer-daemon',
  'root', 'security', 'privacy', 'legal', 'hr', 'careers', 'jobs',
  'newsletter', 'subscribe', 'unsubscribe', 'team', 'hello', 'hi',
  'press', 'media', 'partners', 'dev', 'office', 'service',
]);

// ─────────────────────────────────────────────
// Stage 1: Syntax Validation (RFC 5322)
// ─────────────────────────────────────────────
function validateSyntax(email) {
  if (!email || typeof email !== 'string') return false;

  const [localPart, domain] = email.split('@');

  // Must have exactly one @
  if (!localPart || !domain) return false;
  if (email.split('@').length !== 2) return false;

  // Length limits: local max 64, domain max 255, total max 320
  if (localPart.length > 64) return false;
  if (domain.length > 255) return false;
  if (email.length > 320) return false;

  // RFC 5322 local part: no leading/trailing dots, no consecutive dots
  if (localPart.startsWith('.') || localPart.endsWith('.')) return false;
  if (localPart.includes('..')) return false;

  // Allowed characters in local part (unquoted)
  const localRegex = /^[a-zA-Z0-9!#$%&'*+\-/=?^_`{|}~.]+$/;
  if (!localRegex.test(localPart)) return false;

  // Domain: must have at least one dot, valid TLD
  const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
  if (!domainRegex.test(domain)) return false;

  return true;
}

// ─────────────────────────────────────────────
// Stage 2: DNS / MX Record Checks
// ─────────────────────────────────────────────
async function checkDNS(domain) {
  let mxRecords = [];
  let hasARecord = false;
  let mailServers = [];

  try {
    mxRecords = await dns.resolveMx(domain);
    mxRecords.sort((a, b) => a.priority - b.priority);
    mailServers = mxRecords.map(r => r.exchange);
  } catch (_) {
    // No MX records – fall through to A record check
  }

  if (mailServers.length === 0) {
    try {
      const aRecords = await dns.resolve4(domain);
      if (aRecords && aRecords.length > 0) {
        hasARecord = true;
        mailServers = aRecords; // Use IP directly
      }
    } catch (_) {
      // No A record either
    }
  }

  return {
    hasMX: mxRecords.length > 0,
    hasARecord,
    mailServers,
    valid: mailServers.length > 0,
  };
}

// ─────────────────────────────────────────────
// Stage 3: SMTP Validation
// ─────────────────────────────────────────────
function smtpConnect(host, port = 25, timeoutMs = 8000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const messages = [];
    let lastCode = null;
    let settled = false;

    const finish = (code, detail) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve({ code, detail, messages });
    };

    socket.setTimeout(timeoutMs);

    socket.on('timeout', () => finish(null, 'timeout'));
    socket.on('error', (err) => finish(null, `error: ${err.message}`));

    const sendCmd = (cmd) => {
      try {
        socket.write(`${cmd}\r\n`);
      } catch (_) {}
    };

    let step = 0;
    socket.connect(port, host, () => {});

    socket.on('data', (data) => {
      const text = data.toString();
      messages.push(text.trim());

      // Parse SMTP response code from multi-line or single-line replies
      const lines = text.split('\r\n').filter(Boolean);
      const lastLine = lines[lines.length - 1];
      const match = lastLine.match(/^(\d{3})[ -]/);
      if (!match) return;

      const code = parseInt(match[1], 10);
      lastCode = code;

      if (step === 0 && code === 220) {
        // Banner received → send EHLO
        step = 1;
        sendCmd('EHLO verify.local');
      } else if (step === 1 && (code === 250 || code === 220)) {
        // EHLO accepted → send MAIL FROM
        step = 2;
        sendCmd('MAIL FROM:<verify@verify.local>');
      } else if (step === 2 && code === 250) {
        // MAIL FROM accepted → send RCPT TO — caller provides email
        // We resolve here; caller will send RCPT TO on the same socket
        // But since we can't pass state easily, return the socket-level interaction inline
        step = 3;
        // The resolve is deferred; we communicate step via messages
        finish(250, 'ready_for_rcpt');
      } else if (step === 3) {
        finish(code, lastLine);
      } else if (code >= 400 && code < 600) {
        finish(code, lastLine);
      }
    });
  });
}

async function validateSMTP(email, mailServers) {
  const domain = email.split('@')[1];

  // ── Multi-port SMTP probe ────────────────────────────────────────────
  // Try the top 2 mail servers on both port 25 (standard) and port 587
  // (submission). Many servers / ISPs block outbound port 25 but allow 587.
  const PORTS_TO_TRY = [25, 587];
  const servers = mailServers.slice(0, 2);
  let connectionFailures = 0;
  const totalAttempts = servers.length * PORTS_TO_TRY.length;

  for (const server of servers) {
    for (const port of PORTS_TO_TRY) {
      try {
        const result = await smtpHandshake(server, email, port);

        // A non-null code means we got an actual SMTP response — trust it.
        if (result.code !== null) {
          logger.info(`[EmailVerification] SMTP verdict via ${server}:${port} → ${result.status} (${result.code})`);
          return result;
        }

        // null code = connection-level failure (timeout / refused)
        connectionFailures++;
      } catch (_) {
        connectionFailures++;
      }
    }
  }

  // ── Intelligent fallback when ALL probes fail at connection level ─────
  // If we couldn't establish a TCP connection on any port to any server,
  // the server is likely blocking our probes (firewall / ISP restriction).
  //
  // FALLBACK: Use professional 3rd party (Reoon) to get a definitive verdict.
  if (connectionFailures === totalAttempts) {
    logger.info(`[EmailVerification] Internal probes blocked for ${email}. Attempting 3rd party fallback...`);
    
    try {
      const tpResult = await validateWithThirdParty(email, true, false);
      
      if (tpResult.success) {
        return {
          code: 250,
          status: 'deliverable',
          detail: 'Internal probe blocked; verified via 3rd party (Reoon)',
          thirdPartyVerified: true,
        };
      } else if (tpResult.fallback === false) {
        // Reoon explicitly said it's invalid
        return {
          code: 550,
          status: 'undeliverable',
          detail: 'Internal probe blocked; rejected via 3rd party (Reoon)',
          thirdPartyVerified: true,
        };
      }
    } catch (err) {
      logger.warn(`[EmailVerification] 3rd party fallback failed: ${err.message}`);
    }

    // If 3rd party also fails or is inconclusive, we must remain at 'risky'
    const errorDetail = tpResult?.error ? ` (3rd Party Error: ${tpResult.error})` : '';
    return {
      code: null,
      status: 'risky',
      detail: `Mail server blocked connection and 3rd party validation could not confirm mailbox existence${errorDetail}`,
      connectionBlocked: true,
    };
  }

  return { code: null, status: 'unknown', detail: 'Could not connect to any mail server' };
}

/**
 * Performs a minimal SMTP handshake: EHLO → MAIL FROM → RCPT TO → QUIT.
 * Returns { code, status, detail } where code=null means connection-level failure.
 *
 * @param {string} host
 * @param {string} email  — address under test (used in RCPT TO)
 * @param {number} port   — defaults to 25; also try 587 as fallback
 */
function smtpHandshake(host, email, port = 25) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const TIMEOUT = 8000;
    let step = 0;
    let settled = false;
    let buffer = '';

    const finish = (code, status, detail) => {
      if (settled) return;
      settled = true;
      try { socket.write('QUIT\r\n'); } catch (_) {}
      setTimeout(() => socket.destroy(), 200);
      resolve({ code, status, detail });
    };

    socket.setTimeout(TIMEOUT);
    socket.on('timeout', () => finish(null, 'unknown', `SMTP timeout on port ${port}`));
    socket.on('error', (err) => finish(null, 'unknown', `SMTP error on port ${port}: ${err.message}`));

    socket.on('data', (data) => {
      buffer += data.toString();

      // Wait for complete line (ending with \r\n)
      if (!buffer.includes('\r\n')) return;

      const lines = buffer.split('\r\n');
      buffer = lines.pop(); // keep incomplete trailing line

      for (const line of lines) {
        if (!line) continue;

        const match = line.match(/^(\d{3})([ -])(.*)/);
        if (!match) continue;

        const code = parseInt(match[1], 10);
        const isFinal = match[2] === ' '; // multi-line replies use '-'
        if (!isFinal) continue; // Wait for final line of multi-line response

        if (step === 0 && code === 220) {
          step = 1;
          socket.write(`EHLO verify.local\r\n`);
        } else if (step === 1) {
          if (code === 250 || code === 220) {
            step = 2;
            socket.write(`MAIL FROM:<noreply@verify.local>\r\n`);
          } else {
            // Try HELO fallback
            socket.write(`HELO verify.local\r\n`);
          }
        } else if (step === 2 && code === 250) {
          step = 3;
          socket.write(`RCPT TO:<${email}>\r\n`);
        } else if (step === 3) {
          // RCPT TO response is the definitive verdict
          if (code === 250 || code === 251) {
            finish(code, 'deliverable', 'Mailbox exists and accepts mail');
          } else if (code === 550 || code === 551 || code === 553) {
            finish(code, 'undeliverable', `Mailbox does not exist (${line})`);
          } else if (code === 450 || code === 451 || code === 452) {
            finish(code, 'risky', `Temporary rejection / possible greylisting (${line})`);
          } else if (code === 421 || code === 521) {
            finish(code, 'unknown', `Server unavailable (${line})`);
          } else {
            finish(code, 'unknown', `Unexpected response (${line})`);
          }
        } else if (code >= 400 && step < 3) {
          finish(code, 'unknown', `Unexpected error at step ${step}: ${line}`);
        }
      }
    });

    socket.connect(port, host);
  });
}

// ─────────────────────────────────────────────
// Stage 4: Additional Risk Checks
// ─────────────────────────────────────────────
async function checkCatchAll(domain, mailServers) {
  // Send RCPT TO for a guaranteed-nonexistent address
  const testEmail = `catch_all_probe_${Date.now()}@${domain}`;
  try {
    const result = await smtpHandshake(mailServers[0], testEmail);
    return result.status === 'deliverable'; // If fake address accepted → catch-all
  } catch (_) {
    return false;
  }
}

function checkDisposable(domain) {
  return DISPOSABLE_DOMAINS.has(domain.toLowerCase());
}

function checkRoleBased(localPart) {
  return ROLE_BASED_PREFIXES.has(localPart.toLowerCase());
}

// ─────────────────────────────────────────────
// Main Verification Orchestrator
// ─────────────────────────────────────────────
async function verifyEmail(email) {
  const normalizedEmail = email.trim().toLowerCase();
  const [localPart, domain] = normalizedEmail.split('@');

  // ── Stage 1: Syntax ──
  const syntaxValid = validateSyntax(normalizedEmail);
  if (!syntaxValid) {
    return buildResult(normalizedEmail, 'undeliverable', {
      syntax: false,
      mx: false,
      smtp: null,
      catchAll: false,
      disposable: false,
      roleBased: false,
      reason: 'Failed RFC 5322 syntax validation',
    });
  }

  // ── Stage 2: DNS ──
  let dnsResult;
  try {
    dnsResult = await checkDNS(domain);
  } catch (_) {
    return buildResult(normalizedEmail, 'undeliverable', {
      syntax: true,
      mx: false,
      smtp: null,
      catchAll: false,
      disposable: checkDisposable(domain),
      roleBased: checkRoleBased(localPart),
      reason: 'DNS lookup failed',
    });
  }

  if (!dnsResult.valid) {
    return buildResult(normalizedEmail, 'undeliverable', {
      syntax: true,
      mx: false,
      smtp: null,
      catchAll: false,
      disposable: checkDisposable(domain),
      roleBased: checkRoleBased(localPart),
      reason: 'No MX or A records found for domain',
    });
  }

  // ── Stage 4 (risk flags — done early, not dependent on SMTP) ──
  const isDisposable = checkDisposable(domain);
  const isRoleBased = checkRoleBased(localPart);

  // ── Stage 3: SMTP ──
  let smtpResult;
  try {
    smtpResult = await validateSMTP(normalizedEmail, dnsResult.mailServers);
  } catch (err) {
    smtpResult = { status: 'unknown', detail: `SMTP exception: ${err.message}` };
  }

  // ── Stage 4: Catch-All detection ────────────────────────────────────
  // Skip for trusted consumer domains (Gmail/Outlook/etc.) — port-25 blocked.
  // For all other domains, probe with a fake address to detect catch-alls.
  let isCatchAll = false;
  if (
    smtpResult.status === 'deliverable' &&
    !smtpResult.trustedProvider &&
    dnsResult.mailServers.length > 0
  ) {
    try {
      isCatchAll = await checkCatchAll(domain, dnsResult.mailServers);
    } catch (_) {
      isCatchAll = false;
    }
  }

  // ── Final status resolution ──
  let finalStatus = smtpResult.status ?? 'unknown';

  // Downgrade deliverable to risky if high-risk signals present
  // (Note: Role-based emails are left as deliverable but will have 'acceptable' health)
  if (finalStatus === 'deliverable' && (isCatchAll || isDisposable)) {
    finalStatus = 'risky';
  }

  // Disposable = always undeliverable from business perspective
  if (isDisposable) finalStatus = 'undeliverable';

  return buildResult(normalizedEmail, finalStatus, {
    syntax: true,
    mx: dnsResult.hasMX,
    smtp: smtpResult.status,
    catchAll: isCatchAll,
    disposable: isDisposable,
    roleBased: isRoleBased,
    reason: smtpResult.detail ?? null,
  });
}

// ─────────────────────────────────────────────
// Response Shape Builder
// ─────────────────────────────────────────────
function buildResult(email, status, checks) {
  return {
    email,
    status,          // deliverable | risky | undeliverable | unknown
    health: deriveHealth(status, checks),
    checks: {
      syntax:     checks.syntax,
      mx:         checks.mx,
      smtp:       checks.smtp,
      catchAll:   checks.catchAll,
      disposable: checks.disposable,
      roleBased:  checks.roleBased,
    },
    reason: checks.reason ?? null,
  };
}

function deriveHealth(status, checks) {
  if (status === 'deliverable' && !checks.catchAll && !checks.roleBased) return 'healthy';
  if (status === 'deliverable' && (checks.catchAll || checks.roleBased)) return 'acceptable';
  if (status === 'risky')         return 'risky';
  if (status === 'unknown')       return 'unknown';
  return 'bad';  // undeliverable / syntax failed / disposable
}

module.exports = { verifyEmail };

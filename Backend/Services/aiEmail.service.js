const { OpenAI } = require('openai');
const logger = require('../utils/logger');

const keyPrimary = process.env.Nvidia_super3 || process.env.Llama_KEY;
const keySecondary = process.env.Llama_KEY;

const createClient = (apiKey) => {
    if (!apiKey) return null;
    return new OpenAI({
        apiKey: apiKey,
        baseURL: 'https://openrouter.ai/api/v1',
        timeout: 30000,
        maxRetries: 1
    });
};

const clientPrimary = createClient(keyPrimary);
const clientSecondary = createClient(keySecondary);

/**
 * Robust AI Caller with Auto-Fallback
 */
const callAICompletion = async (prompt, model = 'meta-llama/llama-3.3-70b-instruct') => {
    try {
        if (!clientPrimary) throw new Error('Primary AI client missing');
        const response = await clientPrimary.chat.completions.create({
            model: model,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 1000,
            response_format: { type: 'json_object' }
        });
        return response.choices[0].message.content.trim();
    } catch (err) {
        logger.warn(`⚠️ Primary AI Client failed: ${err.message}. Trying Secondary...`);
        if (clientSecondary && keySecondary !== keyPrimary) {
            const response = await clientSecondary.chat.completions.create({
                model: model,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 1000,
                response_format: { type: 'json_object' }
            });
            return response.choices[0].message.content.trim();
        }
        throw err;
    }
};

/**
 * Robustly parses JSON from AI response, even if it contains preamble or markdown
 */
const parseAIResponse = (text) => {
    try {
        const match = text.match(/\{[\s\S]*\}/);
        if (!match) throw new Error('No JSON object found in AI response');
        return JSON.parse(match[0]);
    } catch (error) {
        logger.error(`❌ AI JSON Parse Error: ${error.message}. Content: ${text.substring(0, 100)}...`);
        throw new Error('Could not parse AI response as JSON');
    }
};

/**
 * Polishes the body: ensures double-spacing between paragraphs and correct sign-off format
 */
const polishBody = (body) => {
    if (!body) return body;

    // Strip wrapping quotes if AI added them
    body = body.trim().replace(/^"+|"+$/g, '').trim();

    // Ensure paragraph breaks exist (if AI forgot them)
    if (!body.includes('\n\n')) {
        body = body.replace(/([.?!])\s+(?=[A-Z])/g, '$1\n\n');
    }

    // Strip ANY existing sign-off variation (handles: no newline, extra newlines, spaces etc.)
    body = body.replace(/[\n\r\s]*regards,?[\n\r\s]*hamdan ahmad[\n\r\s]*/gi, '').trim();

    // Always append the sign-off in the exact correct format
    body = body + '\n\nRegards,\nHamdan Ahmad';

    return body.trim();
};

/**
 * Generates an initial cold outreach email using Llama 3.3 70B
 * @param {object} lead - Full lead object from database
 * @returns {Promise<{subject: string, body: string}>}
 */
const generateOutreachBody = async (lead) => {
    if (!clientPrimary) throw new Error('AI API keys missing. Cannot generate AI email.');

    const {
        name: businessName,
        leadType: industry,
        city,
        website,
        seoTitle,
        seoDescription,
        isResponsive,
        loadTime
    } = lead;

    const isInsecure   = website && website.startsWith('http://');
    const hasNoWebsite = !website;

    // Website is down when scraper could not load it at all
    const isWebsiteDown = !hasNoWebsite &&
        seoTitle && (seoTitle.includes('Unreachable') || seoTitle.includes('Scrape Failed')) &&
        seoDescription && (seoDescription.includes('server error') || seoDescription.includes('ERR_') || seoDescription.includes('Failed to load'));

    const siteLoadedFine = !hasNoWebsite && !isWebsiteDown;
    const firstMeaningfulWord = businessName
        ? businessName.toLowerCase().replace(/^(the|a|an)\s+/i, '').split(' ')[0]
        : '';
    const isSeoMisaligned  = siteLoadedFine && seoTitle && firstMeaningfulWord &&
        !seoTitle.toLowerCase().includes(firstMeaningfulWord);
    const isSeoDescMissing = siteLoadedFine && seoTitle && !seoDescription;
    const hasBadSeo        = isSeoMisaligned || isSeoDescMissing;
    const isSlowLoad       = siteLoadedFine && loadTime && loadTime > 4.5;
    const hasBothSeoAndSpeed = hasBadSeo && isSlowLoad;

    // --- Determine the primary scenario ---
    let scenario = 'AUTOMATION';
    if (hasNoWebsite)            scenario = 'NO_WEBSITE';
    else if (isWebsiteDown)      scenario = 'WEBSITE_DOWN';
    else if (hasBothSeoAndSpeed) scenario = 'SEO_AND_SPEED';
    else if (hasBadSeo)          scenario = 'BAD_SEO';
    else if (isSlowLoad)         scenario = 'SLOW_LOAD';
    else if (isResponsive === false) scenario = 'MOBILE';
    else if (isInsecure)         scenario = 'INSECURE';

    logger.info(`📧 Generating email for "${businessName}" | Scenario: ${scenario}`);

    // ─── Your exact high-converting templates ───────────────────────────────
    const templates = {
        NO_WEBSITE: {
            subject: `${businessName} — customers searching for you online can't find you`,
            body: `${businessName} doesn't have a website — which means customers searching for your service online are going straight to competitors.\n\n81% of customers research a business online before visiting. Without a website you're invisible to all of them. I can build you a professional website within 7 days that puts you in front of local customers searching for exactly what you offer.\n\nInterested? Reply and let's get you online.\n\nRegards,\nHamdan Ahmad`
        },
        WEBSITE_DOWN: {
            subject: `${businessName}'s website is currently unreachable`,
            body: `${businessName}'s website is currently down — every hour it stays down, customers searching for you online are landing on your competitors instead.\n\nA website that can't be reached is worse than no website at all. You're losing real customers right now. I can get it back up quickly and make sure this doesn't happen again.\n\nReply and I'll look into it today.\n\nRegards,\nHamdan Ahmad`
        },
        BAD_SEO: {
            subject: `${businessName} is invisible on Google right now`,
            body: `${businessName} is currently invisible on Google — meaning customers searching for your service nearby are finding competitors instead of you.\n\nThis is fixable. A few small changes to your website and Google will start showing your business to local customers actively searching for what you offer. I can have this done within 48 hours.\n\nReply and I'll show you exactly what's missing today.\n\nRegards,\nHamdan Ahmad`
        },
        SLOW_LOAD: {
            subject: `${businessName}'s website is losing customers before they even arrive`,
            body: `${businessName}'s website is taking too long to load — and Google actively pushes slow websites down in search results, sending your potential customers to faster competitors instead.\n\nMost visitors leave a website if it doesn't load within 3 seconds. Right now yours is slow enough that customers are leaving before they even see what you offer. I can speed it up significantly and improve your Google ranking so local customers find you first.\n\nReply and I'll send you a full breakdown today.\n\nRegards,\nHamdan Ahmad`
        },
        SEO_AND_SPEED: {
            subject: `${businessName} has two things working against it on Google`,
            body: `${businessName} has two things working against it online right now — it's loading slowly and Google can't find it properly.\n\nSlow websites get pushed down in search results. And without proper optimization Google isn't showing your business to local customers searching for your service. The result? Competitors with faster, better optimized websites are getting your customers every single day. I can fix both issues within 48 hours and get your business showing up where it matters.\n\nReply and I'll send you a full breakdown today.\n\nRegards,\nHamdan Ahmad`
        },
        INSECURE: {
            subject: `${businessName} — every browser is warning your visitors away`,
            body: `Before a single customer reads a word about what you do, their browser is already showing them a "Not Secure" warning on your site — and most of them leave the moment they see it.\n\nMoving from HTTP to HTTPS removes this warning permanently and immediately builds trust with every visitor. I build secure websites and systems that help businesses retain the customers they're already attracting.\n\nReply and I'll walk you through exactly how to fix this.\n\nRegards,\nHamdan Ahmad`
        },
        MOBILE: {
            subject: `${businessName} — most of your visitors are having a bad experience`,
            body: `Over 60% of web traffic comes from mobile — and right now, anyone visiting your site on a phone is getting a broken, hard-to-use experience that pushes them straight to a competitor.\n\nThis is one of those silent problems that costs leads daily without any obvious sign. I build modern, mobile-first websites that make sure every visit — on any device — turns into a potential customer.\n\nReply and I'll show you what a properly optimized site looks like for your business.\n\nRegards,\nHamdan Ahmad`
        },
        AUTOMATION: {
            subject: `${businessName} might be losing 40-60% of potential clients`,
            body: `${businessName} might be losing 40-60% of potential clients — not because of your website, but because follow-ups and client communication are still happening manually.\n\nI build custom automation that handles your entire client pipeline — lead capture, follow up, appointment reminders and customer communication — automatically. This means more clients closed without extra work on your end.\n\nWorth a quick chat?\n\nRegards,\nHamdan Ahmad`
        }
    };

    const template = templates[scenario];

    const prompt = `### WHO YOU ARE
You are Hamdan Ahmad, a cold outreach specialist who writes short, direct, high-converting emails. You are based in Pakistan.

### THE LEAD
- Business Name: ${businessName || 'this business'}
- Industry: ${industry || 'their industry'}
- City: ${city || 'their area'}
- Scenario: ${scenario}
- Load Time: ${loadTime ? loadTime + 's' : 'N/A'}

### YOUR TASK
Personalize the TEMPLATE below for this specific lead. Follow it VERY closely.
Only make these minimal changes:
1. Business name is already inserted: "${businessName}" — keep it exactly as is
2. If load time appears in the template, use actual data: "${loadTime}s"
3. Make tiny natural wording variations (max 10%) so it doesn't feel copy-pasted
4. Keep exactly 3 paragraphs separated by blank lines
5. Sign-off must always be exactly: "Regards,
\\nHamdan Ahmad"

### TEMPLATE TO FOLLOW
Subject: ${template.subject}
Body:
${template.body}

### ABSOLUTE RULES
- Do NOT add or remove paragraphs
- Do NOT add emojis, bold text, markdown or any notes
- Do NOT change the core message, statistics or pitch angle
- Subject MUST contain the business name

### OUTPUT
Return ONLY valid JSON: { "subject": "...", "body": "..." }`;

    try {
        const textContent = await callAICompletion(prompt);
        const result = parseAIResponse(textContent);
        return {
            subject: result.subject,
            body: polishBody(result.body)
        };
    } catch (error) {
        logger.error(`❌ Failed AI email generation, using raw template: ${error.message}`);
        // Smart fallback: use the template directly if AI fails — no email is ever lost
        return {
            subject: template.subject,
            body: polishBody(template.body)
        };
    }
};

/**
 * Generates a follow-up email after 3 days
 * @param {object} lead - Full lead object
 * @returns {Promise<{subject: string, body: string}>}
 */
const generateFollowUpBody = async (lead) => {
    if (!clientPrimary) throw new Error('AI API keys missing. Cannot generate AI email.');

    const {
        name: businessName,
        leadType: industry,
        city,
        website,
        seoTitle,
        seoDescription,
        isResponsive,
        loadTime
    } = lead;

    const isInsecure   = website && website.startsWith('http://');
    const hasNoWebsite = !website;
    const isWebsiteDown = !hasNoWebsite &&
        seoTitle && (seoTitle.includes('Unreachable') || seoTitle.includes('Scrape Failed')) &&
        seoDescription && (seoDescription.includes('server error') || seoDescription.includes('ERR_') || seoDescription.includes('Failed to load'));

    const siteLoadedFine = !hasNoWebsite && !isWebsiteDown;
    const firstMeaningfulWord = businessName
        ? businessName.toLowerCase().replace(/^(the|a|an)\s+/i, '').split(' ')[0]
        : '';
    const isSeoMisaligned  = siteLoadedFine && seoTitle && firstMeaningfulWord &&
        !seoTitle.toLowerCase().includes(firstMeaningfulWord);
    const isSeoDescMissing = siteLoadedFine && seoTitle && !seoDescription;
    const hasBadSeo        = isSeoMisaligned || isSeoDescMissing;
    const isSlowLoad       = siteLoadedFine && loadTime && loadTime > 4.5;
    const hasBothSeoAndSpeed = hasBadSeo && isSlowLoad;

    let scenario = 'AUTOMATION';
    if (hasNoWebsite)            scenario = 'NO_WEBSITE';
    else if (isWebsiteDown)      scenario = 'WEBSITE_DOWN';
    else if (hasBothSeoAndSpeed) scenario = 'SEO_AND_SPEED';
    else if (hasBadSeo)          scenario = 'BAD_SEO';
    else if (isSlowLoad)         scenario = 'SLOW_LOAD';
    else if (isResponsive === false) scenario = 'MOBILE';
    else if (isInsecure)         scenario = 'INSECURE';

    const followUpTemplates = {
        NO_WEBSITE: {
            subject: `Following up — ${businessName}`,
            body: `I sent you a note a few days ago and wanted to circle back in case it got buried.\n\nEvery day without a website is another day customers who search for your service find nothing — and call someone else instead. That gap is easy to close and I can help you with that.\n\nWant to take 10 minutes to see what it could look like? Reply and let's talk.\n\nRegards,\nHamdan Ahmad`
        },
        WEBSITE_DOWN: {
            subject: `Still checking in — your website`,
            body: `Just following up on my last note. Didn't want it to slip through the cracks.\n\nWhen I reached out, your site was down — if it's still not fully sorted, every day it stays that way hands leads to your competitors silently. These things are usually a quick fix.\n\nReply and I'll take a look today.\n\nRegards,\nHamdan Ahmad`
        },
        BAD_SEO: {
            subject: `Following up — your Google visibility`,
            body: `Just circling back to see if you had a chance to read my last note.\n\nYour SEO still isn't reflecting your business properly — which means Google is ranking competitors above you for local searches you should be winning. This is one of the easiest things to fix and I can help you with it.\n\nWorth a 10-minute conversation? Reply and let's get into it.\n\nRegards,\nHamdan Ahmad`
        },
        SLOW_LOAD: {
            subject: `Following up — your site speed`,
            body: `Just checking back in on my previous message.\n\nYour site is still taking ${loadTime}s to load — every extra second is customers quietly leaving for a competitor. A faster site directly improves your Google ranking and the number of visitors who stay.\n\nReply and I'll send you a breakdown of exactly what's causing it.\n\nRegards,\nHamdan Ahmad`
        },
        SEO_AND_SPEED: {
            subject: `Following up — Google visibility and speed`,
            body: `Just circling back in case my last message got lost.\n\nYour site is still loading slowly and Google still can't find it properly — two issues that together are consistently sending your customers to competitors. I can have both fixed within 48 hours.\n\nReply and I'll send you the full breakdown today.\n\nRegards,\nHamdan Ahmad`
        },
        INSECURE: {
            subject: `Following up — site security`,
            body: `Just following up on my previous note in case it got lost.\n\nYour site is still flagged as "Not Secure" by every browser — most visitors leave before they even read your page. Moving to HTTPS is a quick win that builds trust immediately and stops this silent leak.\n\nInterested? Reply and I'll walk you through it.\n\nRegards,\nHamdan Ahmad`
        },
        MOBILE: {
            subject: `Following up — your mobile experience`,
            body: `Just checking back on my earlier message.\n\nYour site is still difficult to use on mobile — and that's where the majority of your potential customers are browsing. Every visitor on a phone is quietly having a bad experience right now.\n\nReply and I'll show you exactly what a fixed version looks like.\n\nRegards,\nHamdan Ahmad`
        },
        AUTOMATION: {
            subject: `Following up — ${businessName}`,
            body: `I sent you a quick note a few days ago and wanted to check in.\n\nMost ${industry || 'businesses'} in ${city || 'your area'} are still handling lead follow-up manually — and consistently leaving revenue on the table because of it. I build systems that run in the background and close more clients automatically.\n\nIf that sounds worth exploring, reply and let's talk.\n\nRegards,\nHamdan Ahmad`
        }
    };

    const followUpTemplate = followUpTemplates[scenario];

    const prompt = `### WHO YOU ARE
You are Hamdan Ahmad, following up 3 days after your first cold email to ${businessName}.

### THE LEAD
- Business: ${businessName}
- Industry: ${industry || 'their industry'}
- City: ${city || 'their area'}
- Scenario: ${scenario}
- Load Time: ${loadTime ? loadTime + 's' : 'N/A'}

### YOUR TASK
Personalize the FOLLOW-UP TEMPLATE below for this lead. Follow it VERY closely.
Only change:
1. Business name: "${businessName}" — already inserted, keep as is
2. Load time if present: "${loadTime}s"
3. Tiny natural variations (max 10%)
4. Keep exactly 3 paragraphs
5. Sign-off: "Regards,\\nHamdan Ahmad"

### TEMPLATE
Subject: ${followUpTemplate.subject}
Body:
${followUpTemplate.body}

### RULES
- 3 paragraphs only, separated by blank lines
- No emojis, bold, markdown or notes
- Do not change core message or statistics
- Subject must include the business name

### OUTPUT
Return ONLY valid JSON: { "subject": "...", "body": "..." }`;

    try {
        const textContent = await callAICompletion(prompt);
        const result = parseAIResponse(textContent);
        return {
            subject: result.subject,
            body: polishBody(result.body)
        };
    } catch (error) {
        logger.error(`❌ Failed AI follow-up generation, using raw template: ${error.message}`);
        return {
            subject: followUpTemplate.subject,
            body: polishBody(followUpTemplate.body)
        };
    }
};

/**
 * Uses AI to intelligently rank a list of emails to find the most valuable person (decision maker)
 * @param {string} businessName
 * @param {string[]} emails
 * @returns {Promise<string[]>} - Ranked list of emails
 */
const rankEmailsWithAI = async (businessName, emails) => {
    if (!emails || emails.length <= 1) return emails || [];

    const prompt = `### TASK
You are a Lead Generation Intelligence Specialist. Rank the following emails from most valuable (Decision Maker, Founder, Partner, CEO) to least valuable for a cold outreach campaign.

### BUSINESS
- Name: ${businessName}

### CANDIDATES
${emails.map((e, i) => `${i + 1}. ${e}`).join('\n')}

### RANKING RULES
1. PERSONALIZED is KING: Emails like 'john@', 'j.doe@', 'smith@' are #1 priority — they reach a real human.
2. BUSINESS DOMAIN is QUEEN: Any email on the business's own domain beats a generic @gmail/@yahoo address.
3. GENERIC is LAST: 'info@', 'office@', 'contact@', 'reception@' are gatekeepers.
4. If an email name matches a partner's or owner's name for the business, it is extremely high value.

### OUTPUT
Return ONLY valid JSON array of the emails in ranked order: ["best@...", "second@...", ...]`;

    try {
        const response = await callAICompletion(prompt, 'meta-llama/llama-3.3-70b-instruct');
        const ranked = parseAIResponse(response);
        if (Array.isArray(ranked)) {
            logger.info(`🧠 AI ranked ${emails.length} candidates for "${businessName}". Winner: ${ranked[0]}`);
            return ranked;
        }
        return emails;
    } catch (error) {
        logger.warn(`⚠️ AI Email Ranking failed: ${error.message}. Falling back to default order.`);
        return emails;
    }
};

module.exports = {
    generateOutreachBody,
    generateFollowUpBody,
    rankEmailsWithAI
};

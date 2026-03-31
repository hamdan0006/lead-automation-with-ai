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
 * Strips any sign-off variation and appends guaranteed correct format
 */
const polishBody = (body) => {
    if (!body) return body;
    body = body.trim().replace(/^"+|"+$/g, '').trim();
    if (!body.includes('\n\n')) {
        body = body.replace(/([.?!])\s+(?=[A-Z])/g, '$1\n\n');
    }
    // Strip any existing sign-off (handles all variations: no newline, extra spaces, etc.)
    body = body.replace(/[\n\r\s]*regards,?[\n\r\s]*hamdan ahmad[\n\r\s]*/gi, '').trim();
    // Always append in exact correct format
    body = body + '\n\nRegards,\nHamdan Ahmad';
    return body.trim();
};

// ─── Fallback templates (used if AI fails) ──────────────────────────────────
const getFallbackTemplate = (scenario, businessName, loadTime) => {
    const t = {
        NO_WEBSITE: {
            subject: `${businessName} — customers searching for you online can't find you`,
            body: `${businessName} doesn't have a website — which means customers searching for your service online are going straight to competitors.\n\n81% of customers research a business online before visiting. Without a website you're invisible to all of them. I can build you a professional website within 7 days that puts you in front of local customers searching for exactly what you offer.\n\nInterested? Reply and let's get you online.`
        },
        WEBSITE_DOWN: {
            subject: `${businessName}'s website is currently unreachable`,
            body: `${businessName}'s website is currently down — every hour it stays down, customers searching for you online are landing on your competitors instead.\n\nA website that can't be reached is worse than no website at all. You're losing real customers right now. I can get it back up quickly and make sure this doesn't happen again.\n\nReply and I'll look into it today.`
        },
        BAD_SEO: {
            subject: `${businessName} is invisible on Google right now`,
            body: `${businessName} is currently invisible on Google — meaning customers searching for your service nearby are finding competitors instead of you.\n\nThis is fixable. A few small changes to your website and Google will start showing your business to local customers actively searching for what you offer. I can have this done within 48 hours.\n\nReply and I'll show you exactly what's missing today.`
        },
        SLOW_LOAD: {
            subject: `${businessName}'s website is losing customers before they even arrive`,
            body: `${businessName}'s website is taking too long to load — and Google actively pushes slow websites down in search results, sending your potential customers to faster competitors instead.\n\nMost visitors leave a website if it doesn't load within 3 seconds. Right now yours is slow enough that customers are leaving before they even see what you offer. I can speed it up significantly and improve your Google ranking so local customers find you first.\n\nReply and I'll send you a full breakdown today.`
        },
        SEO_AND_SPEED: {
            subject: `${businessName} has two things working against it on Google`,
            body: `${businessName} has two things working against it online right now — it's loading slowly and Google can't find it properly.\n\nSlow websites get pushed down in search results. And without proper optimization Google isn't showing your business to local customers searching for your service. The result? Competitors with faster, better optimized websites are getting your customers every single day. I can fix both issues within 48 hours and get your business showing up where it matters.\n\nReply and I'll send you a full breakdown today.`
        },
        INSECURE: {
            subject: `${businessName} — every browser is warning your visitors away`,
            body: `Before a single customer reads a word about what you do, their browser is already showing them a "Not Secure" warning on your site — and most of them leave the moment they see it.\n\nMoving from HTTP to HTTPS removes this warning permanently and immediately builds trust with every visitor. I build secure websites and systems that help businesses retain the customers they're already attracting.\n\nReply and I'll walk you through exactly how to fix this.`
        },
        MOBILE: {
            subject: `${businessName} — most of your visitors are having a bad experience`,
            body: `Over 60% of web traffic comes from mobile — and right now, anyone visiting your site on a phone is getting a broken, hard-to-use experience that pushes them straight to a competitor.\n\nThis is one of those silent problems that costs leads daily without any obvious sign. I build modern, mobile-first websites that make sure every visit — on any device — turns into a potential customer.\n\nReply and I'll show you what a properly optimized site looks like for your business.`
        },
        AUTOMATION: {
            subject: `${businessName} might be losing 40-60% of potential clients`,
            body: `${businessName} might be losing 40-60% of potential clients — not because of your website, but because follow-ups and client communication are still happening manually.\n\nI build custom automation that handles your entire client pipeline — lead capture, follow up, appointment reminders and customer communication — automatically. This means more clients closed without extra work on your end.\n\nWorth a quick chat?`
        }
    };
    return t[scenario] || t['AUTOMATION'];
};

// ─── Scenario strategies for AI (what to say, not how to say it) ─────────────
const getScenarioStrategy = (scenario, businessName) => {
    const strategies = {
        NO_WEBSITE: `SITUATION: ${businessName} has no website at all.
ANGLE: Customers searching online for their service find nothing and go straight to competitors.
KEY STAT: 81% of customers research a business online before deciding to visit or contact them.
PITCH: You can build them a professional website within 7 days and get them in front of local searchers.
CTA: Invite a reply to get started.`,

        WEBSITE_DOWN: `SITUATION: ${businessName}'s website is currently down or returning errors.
ANGLE: Every hour the site stays broken, potential customers land on a broken page and leave for a competitor.
KEY POINT: A broken website is actively worse than having no website — it signals unprofessionalism.
PITCH: You can fix it quickly and put systems in place to prevent recurrence.
CTA: Invite urgent reply, you'll look into it today.`,

        BAD_SEO: `SITUATION: ${businessName} has SEO issues — missing or mismatched meta title/description.
ANGLE: Google is not properly indexing or ranking their business, so local customers find competitors instead.
KEY POINT: This is completely fixable with a few targeted changes. You can do it in 48 hours.
PITCH: Small SEO fixes that make Google start surfacing their business to local searchers.
CTA: Invite a reply, offer to show exactly what's missing.`,

        SLOW_LOAD: `SITUATION: ${businessName}'s website loads too slowly.
ANGLE: Google penalizes slow websites in rankings, pushing them below faster competitors. Visitors also abandon slow pages.
KEY STAT: Most visitors leave if a page takes more than 3 seconds to load.
PITCH: You can significantly speed up the site and improve their ranking so local customers find them first.
CTA: Invite a reply, offer a full breakdown.`,

        SEO_AND_SPEED: `SITUATION: ${businessName} has BOTH slow load speed AND SEO problems at the same time.
ANGLE: These two issues compound each other — Google penalizes slow sites AND doesn't rank them properly for local searches. Competitors win on both fronts.
PITCH: You can fix both within 48 hours and get them properly visible in local search.
CTA: Invite a reply, offer a full breakdown.`,

        INSECURE: `SITUATION: ${businessName}'s website runs on HTTP (not HTTPS).
ANGLE: Every modern browser shows a "Not Secure" warning to visitors before they even read anything — most leave immediately.
PITCH: Moving to HTTPS is a permanent fix that immediately builds visitor trust. You can handle this for them.
CTA: Invite a reply, offer to walk them through the fix.`,

        MOBILE: `SITUATION: ${businessName}'s website is not mobile-friendly.
ANGLE: Over 60% of web traffic is on mobile. Their current visitors on phones are having a broken experience and leaving for competitors.
KEY POINT: This silently costs leads every single day with no obvious sign.
PITCH: You build modern mobile-first websites that convert on every device.
CTA: Invite a reply, offer to show them what a proper mobile version looks like.`,

        AUTOMATION: `SITUATION: ${businessName} has a decent website and online presence — no major technical issues.
ANGLE: The gap is in their sales pipeline. Businesses lose 40-60% of potential clients not from bad marketing but from slow or absent follow-up.
PITCH: You build custom automation — lead capture, follow-ups, appointment reminders, client communication — that runs in the background automatically. More clients closed without extra work.
CTA: Invite a reply for a quick chat.`
    };
    return strategies[scenario] || strategies['AUTOMATION'];
};

/**
 * Generates an initial cold outreach email using Llama 3.3 70B
 */
const generateOutreachBody = async (lead) => {
    if (!clientPrimary) throw new Error('AI API keys missing. Cannot generate AI email.');

    const { name: businessName, leadType: industry, city, website, seoTitle, seoDescription, isResponsive, loadTime } = lead;

    const isInsecure    = website && website.startsWith('http://');
    const hasNoWebsite  = !website;
    const isWebsiteDown = !hasNoWebsite &&
        seoTitle && (seoTitle.includes('Unreachable') || seoTitle.includes('Scrape Failed')) &&
        seoDescription && (seoDescription.includes('server error') || seoDescription.includes('ERR_') || seoDescription.includes('Failed to load'));

    const siteLoadedFine = !hasNoWebsite && !isWebsiteDown;
    const firstMeaningfulWord = businessName ? businessName.toLowerCase().replace(/^(the|a|an)\s+/i, '').split(' ')[0] : '';
    const isSeoMisaligned  = siteLoadedFine && seoTitle && firstMeaningfulWord && !seoTitle.toLowerCase().includes(firstMeaningfulWord);
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

    logger.info(`📧 Generating email for "${businessName}" | Scenario: ${scenario}`);

    const examples = {
        NO_WEBSITE: `${businessName} doesn't have a website — which means customers searching for your service online are going straight to competitors.

81% of customers research a business online before visiting. Without a website you're invisible to all of them. I can build you a professional website within 7 days that puts you in front of local customers searching for exactly what you offer.

Interested? Reply and let's get you online.`,

        WEBSITE_DOWN: `${businessName}'s website is currently down — every hour it stays down, customers searching for you online are landing on your competitors instead.

A website that can't be reached is worse than no website at all. You're losing real customers right now. I can get it back up quickly and make sure this doesn't happen again.

Reply and I'll look into it today.`,

        BAD_SEO: `${businessName} is currently invisible on Google — meaning customers searching for your service nearby are finding competitors instead of you.

This is fixable. A few small changes to your website and Google will start showing your business to local customers actively searching for what you offer. I can have this done within 48 hours.

Reply and I'll show you exactly what's missing today.`,

        SLOW_LOAD: `${businessName}'s website is taking too long to load — and Google actively pushes slow websites down in search results, sending your potential customers to faster competitors instead.

Most visitors leave a website if it doesn't load within 3 seconds. Right now yours is slow enough that customers are leaving before they even see what you offer. I can speed it up significantly and improve your Google ranking so local customers find you first.

Reply and I'll send you a full breakdown today.`,

        SEO_AND_SPEED: `${businessName} has two things working against it online right now — it's loading slowly and Google can't find it properly.

Slow websites get pushed down in search results. And without proper optimization Google isn't showing your business to local customers searching for your service. The result? Competitors with faster, better optimized websites are getting your customers every single day. I can fix both issues within 48 hours and get your business showing up where it matters.

Reply and I'll send you a full breakdown today.`,

        INSECURE: `Before a single customer reads a word about what you do, their browser is already showing them a "Not Secure" warning on your site — and most of them leave the moment they see it.

Moving from HTTP to HTTPS removes this warning permanently and immediately builds trust with every visitor. I build secure websites and systems that help businesses retain the customers they're already attracting.

Reply and I'll walk you through exactly how to fix this.`,

        MOBILE: `Over 60% of web traffic comes from mobile — and right now, anyone visiting your site on a phone is getting a broken, hard-to-use experience that pushes them straight to a competitor.

This is one of those silent problems that costs leads daily without any obvious sign. I build modern, mobile-first websites that make sure every visit — on any device — turns into a potential customer.

Reply and I'll show you what a properly optimized site looks like for your business.`,

        AUTOMATION: `${businessName} might be losing 40-60% of potential clients — not because of your website, but because follow-ups and client communication are still happening manually.

I build custom automation that handles your entire client pipeline — lead capture, follow up, appointment reminders and customer communication — automatically. This means more clients closed without extra work on your end.

Worth a quick chat?`
    };

    const example = examples[scenario];
    const strategy = getScenarioStrategy(scenario, businessName);

    const prompt = `### WHO YOU ARE
You are Hamdan Ahmad — a direct, no-fluff cold email writer based in Pakistan.
Every email you write must sound fresh and human — never copy-pasted.

### THE LEAD
Business: ${businessName}
Industry: ${industry || 'their industry'}
City: ${city || 'their area'}

### WHAT THIS EMAIL IS ABOUT
${strategy}

### EXAMPLE — THIS IS THE STYLE, TONE AND STRUCTURE I WANT
Study this example carefully. This is the exact punch, directness and structure expected.
Then write your OWN version — same message and stats, completely different wording.

---
${example}
---

### YOUR TASK
Write a fresh email inspired by the example above. Same:
- 3 paragraph structure
- Direct, punchy tone (no fluff, no corporate speak)
- Same key stats and pitch angle
- Business name "${businessName}" in Para 1 only, then use "you/your"

But different:
- Different opening sentence
- Different word choices throughout
- Different CTA phrasing

### RULES
- 80-120 words total in body
- No emojis, no bold, no markdown, no greetings
- Do NOT include a sign-off — it is added automatically
- Subject must contain "${businessName}" and signal the problem

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
        logger.error(`❌ AI generation failed, using fallback template: ${error.message}`);
        const fallback = getFallbackTemplate(scenario, businessName, loadTime);
        return {
            subject: fallback.subject,
            body: polishBody(fallback.body)
        };
    }
};

/**
 * Generates a follow-up email after 3 days
 */
const generateFollowUpBody = async (lead) => {
    if (!clientPrimary) throw new Error('AI API keys missing. Cannot generate AI email.');

    const { name: businessName, leadType: industry, city, website, seoTitle, seoDescription, isResponsive, loadTime } = lead;

    const isInsecure    = website && website.startsWith('http://');
    const hasNoWebsite  = !website;
    const isWebsiteDown = !hasNoWebsite &&
        seoTitle && (seoTitle.includes('Unreachable') || seoTitle.includes('Scrape Failed')) &&
        seoDescription && (seoDescription.includes('server error') || seoDescription.includes('ERR_') || seoDescription.includes('Failed to load'));

    const siteLoadedFine = !hasNoWebsite && !isWebsiteDown;
    const firstMeaningfulWord = businessName ? businessName.toLowerCase().replace(/^(the|a|an)\s+/i, '').split(' ')[0] : '';
    const isSeoMisaligned  = siteLoadedFine && seoTitle && firstMeaningfulWord && !seoTitle.toLowerCase().includes(firstMeaningfulWord);
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

    const strategy = getScenarioStrategy(scenario, businessName);

    const prompt = `### WHO YOU ARE
You are Hamdan Ahmad — following up 3 days after your first cold email to ${businessName}.
You write short, warm, human follow-ups. Never pushy or salesy.

### THE LEAD
Business: ${businessName}
Industry: ${industry || 'their industry'}
City: ${city || 'their area'}

### ORIGINAL ISSUE YOU EMAILED ABOUT
${strategy}

### FOLLOW-UP STRUCTURE (3 paragraphs)
Para 1: Warm, human re-introduction. Mention you sent a note a few days ago. 1-2 sentences max.
Para 2: Briefly remind them of the specific problem and what it is quietly costing them right now. 2 sentences.
Para 3: One low-friction CTA. Keep it easy to reply to.

### RULES
- 60-80 words total across all 3 paragraphs.
- Business name appears ONCE maximum. Use "you/your" everywhere else.
- Tone: Human, warm, zero pressure.
- No emojis, no bold, no markdown.
- Do NOT include a sign-off — it is added automatically.
- Subject must include "${businessName}".

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
        logger.error(`❌ AI follow-up generation failed: ${error.message}`);
        return {
            subject: `Following up — ${businessName}`,
            body: polishBody(`Just circling back on my note from a few days ago — didn't want it to get lost.\n\nThe issue I mentioned is still silently costing you leads every day. It's the kind of thing that's quick to fix once you know what it is.\n\nReply and I'll walk you through it.`)
        };
    }
};

/**
 * Uses AI to rank emails by decision-maker value
 */
const rankEmailsWithAI = async (businessName, emails) => {
    if (!emails || emails.length <= 1) return emails || [];

    const prompt = `### TASK
Rank these emails from most to least valuable for cold outreach. Most valuable = directly reaches a decision maker (owner, partner, founder, CEO).

### BUSINESS: ${businessName}

### EMAILS
${emails.map((e, i) => `${i + 1}. ${e}`).join('\n')}

### RULES
1. Personal name emails (john@, j.smith@) = highest value
2. Business domain emails beat generic providers (@gmail, @yahoo)
3. Generic inboxes (info@, contact@, office@, reception@) = lowest value

### OUTPUT
Return ONLY a valid JSON array in ranked order: ["best@...", "second@...", ...]`;

    try {
        const response = await callAICompletion(prompt);
        const ranked = parseAIResponse(response);
        if (Array.isArray(ranked)) {
            logger.info(`🧠 AI ranked ${emails.length} candidates for "${businessName}". Winner: ${ranked[0]}`);
            return ranked;
        }
        return emails;
    } catch (error) {
        logger.warn(`⚠️ AI Email Ranking failed: ${error.message}. Using default order.`);
        return emails;
    }
};

module.exports = {
    generateOutreachBody,
    generateFollowUpBody,
    rankEmailsWithAI
};

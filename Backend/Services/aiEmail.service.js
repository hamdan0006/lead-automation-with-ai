const { OpenAI } = require('openai');
const logger = require('../utils/logger');

const apiKey = process.env.Llama_KEY;

let openai;
if (apiKey) {
    openai = new OpenAI({
        apiKey: apiKey,
        baseURL: 'https://openrouter.ai/api/v1'
    });
}

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
    // Strip leading/trailing double quotes if the AI wrapped the whole response
    body = body.trim().replace(/^"+|"+$/g, '').trim();
    
    if (!body.includes('\n\n')) {
        body = body.replace(/([.?!])\s+(?=[A-Z])/g, '$1\n\n');
    }
    // Case-insensitive sign-off normalisation (handles any casing the AI outputs)
    const signOffRegex = /regards,?\s*hamdan ahmad/i;
    if (signOffRegex.test(body)) {
        body = body.replace(signOffRegex, 'Regards,\nHamdan Ahmad');
    } else if (!body.toLowerCase().includes('hamdan ahmad')) {
        // AI forgot it entirely, add it back nicely
        body = body.trim() + '\n\nRegards,\nHamdan Ahmad';
    }
    return body.trim();
};

/**
 * Generates an initial cold outreach email using Llama 3.3 70B
 * @param {object} lead - Full lead object from database
 * @returns {Promise<{subject: string, body: string}>}
 */
const generateOutreachBody = async (lead) => {
    if (!openai) throw new Error('Llama API key missing. Cannot generate AI email.');

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

    const isInsecure    = website && website.startsWith('http://');
    const hasNoWebsite  = !website;

    // Website is down ONLY when scraper returned a server error (not just a timeout or blocked)
    const isWebsiteDown = !hasNoWebsite &&
        seoTitle && seoTitle.includes('Unreachable') &&
        seoDescription && seoDescription.includes('The website returned a server error');

    // SEO is flagged ONLY when the site loaded fine but metadata doesn't match the business
    const siteLoadedFine = !hasNoWebsite && !isWebsiteDown;
    // Skip leading articles (the/a/an) so "The Grand Dental" doesn't false-flag on "the"
    const firstMeaningfulWord = businessName
        ? businessName.toLowerCase().replace(/^(the|a|an)\s+/i, '').split(' ')[0]
        : '';
    const isSeoMisaligned  = siteLoadedFine && seoTitle && firstMeaningfulWord &&
        !seoTitle.toLowerCase().includes(firstMeaningfulWord);
    const isSeoDescMissing = siteLoadedFine && seoTitle && !seoDescription;
    const hasBadSeo        = isSeoMisaligned || isSeoDescMissing;

    // Load time: slow = >4.5s (lowest priority — only used if no other issue exists, or as supplemental)
    const isSlowLoad = siteLoadedFine && loadTime && loadTime > 4.5;

    let primaryIssue = '';
    let issueContext = '';
    let seoSpecialHandling = false;

    if (hasNoWebsite) {
        primaryIssue = 'Missing Website';
        issueContext = `Your business does not have a website. Without one, you are completely invisible to every customer who searches for your service online.`;
    } else if (isWebsiteDown) {
        primaryIssue = 'Website is Down';
        issueContext = `Your website is currently returning a server error — anyone searching for your business right now lands on a broken page and moves on to a competitor.`;
    } else if (isResponsive === false) {
        primaryIssue = 'Poor Mobile Experience';
        issueContext = `Your site is difficult to use on mobile, which is where most customers browse. This quietly pushes them to a competitor before they even see what you offer.`;
    } else if (hasBadSeo) {
        primaryIssue = 'Weak SEO';
        issueContext = `Your website's SEO ${isSeoMisaligned ? "doesn't reflect your business name" : "is missing a meta description"} — Google doesn't rank you properly, so local customers searching for your service find competitors first.`;
        seoSpecialHandling = true;
    } else if (isInsecure) {
        primaryIssue = 'Security Warning';
        issueContext = `Your site runs on http — every browser flags it as "Not Secure", causing most visitors to leave before they read a single word about what you do.`;
    } else if (isSlowLoad) {
        primaryIssue = 'Slow Load Speed';
        issueContext = `Your website takes ${loadTime}s to load — most visitors abandon a page if it takes longer than 4 seconds to load, which means you're likely losing potential customers before they even see what you offer.`;
    } else {
        primaryIssue = 'Automation Opportunity';
        issueContext = `Your online presence is solid. The gap now is that most ${industry || 'businesses'} in ${city || 'your area'} are still handling lead generation manually, leaving consistent revenue on the table.`;
    }

    // Collect ALL secondary issues so the AI mentions every problem it can help with
    const additionalIssues = [];
    if (primaryIssue !== 'Weak SEO'       && hasBadSeo)           additionalIssues.push(`Weak SEO: ${isSeoMisaligned ? "the page title doesn't reflect the business name" : "meta description is missing"}`);
    if (primaryIssue !== 'Security Warning' && isInsecure)         additionalIssues.push('Security: the site runs on http and is flagged as "Not Secure" by every browser');
    if (primaryIssue !== 'Poor Mobile Experience' && isResponsive === false) additionalIssues.push('Mobile: the site is not optimised for mobile users');
    if (primaryIssue !== 'Slow Load Speed' && isSlowLoad)           additionalIssues.push(`Slow Load: the site takes ${loadTime}s to load — above the 4.5s threshold where visitors begin to abandon`);

    const isNoIssue = !hasNoWebsite && !isWebsiteDown && !hasBadSeo && isResponsive !== false && !isInsecure && !isSlowLoad;

    // --- Scenario-specific example email to guide AI output quality ---
    let exampleEmail = '';

    if (hasNoWebsite) {
        exampleEmail = `
EXAMPLE (No Website):
Subject: ${businessName} — a quick question
Body:
I have been doing research into ${industry || 'local businesses'} in ${city || 'your area'} and noticed you don't have a website for your business yet.

Every customer who searches for your service online right now finds nothing — and moves straight to a competitor who does. I am an experienced Web Developer who builds modern websites that help businesses grow and get found.

Reply and I'll show you exactly what a website could do for your business.

Regards,
Hamdan Ahmad`;
    } else if (isWebsiteDown) {
        exampleEmail = `
EXAMPLE (Website Down):
Subject: Your website is down right now
Body:
I came across your website and noticed it is currently down.

Right now any potential customer who searches for your service lands on a broken page and moves straight to your competitor. I am an experienced Web Developer and SEO specialist who builds fast and reliable systems that rank and grow businesses.

Reply now and I'll look into it today.

Regards,
Hamdan Ahmad`;
    } else if (hasBadSeo) {
        exampleEmail = `
EXAMPLE (Bad SEO):
Subject: Customers can't find you on Google
Body:
I came across your website and noticed that your SEO doesn't reflect your business name properly — when someone in your area searches for your service, Google ranks competitors above you.

I am a Web Developer and SEO specialist who helps businesses rank higher on Google by ensuring their site is fast and clearly understood by search engines. Fixing your metadata alone can significantly shift how many customers find you organically.

This kind of edge lets you outperform local players who don't even know why their traffic is dropping. Want to see how many customers you're missing?

Regards,
Hamdan Ahmad`;
    } else if (isInsecure) {
        exampleEmail = `
EXAMPLE (Insecure HTTP):
Subject: Your website is flagged as Not Secure
Body:
I came across your website and noticed it is marked "Not Secure" in every browser — a warning that sends most visitors straight back to Google before they even read what you do.

Moving to HTTPS fixes this permanently and immediately builds trust. I build secure websites and systems that help businesses grow.

Resolving this puts you ahead of every local competitor still running on http and losing visitors. Reply and I'll walk you through how to fix it.

Regards,
Hamdan Ahmad`;
    } else if (isResponsive === false) {
        exampleEmail = `
EXAMPLE (Poor Mobile Experience):
Subject: Your website is difficult to use on mobile
Body:
I came across your website and noticed it is quite difficult to use on mobile devices, which is where most of your local customers are actually browsing.

When a site doesn't work on a phone, most people leave for a competitor before seeing what you offer. I build modern, responsive websites that help businesses grow.

Getting this fixed ensures you aren't silently handing leads to competitors. Reply and I'll show you what a mobile-ready site looks like for you.

Regards,
Hamdan Ahmad`;
    } else if (isSlowLoad) {
        exampleEmail = `
EXAMPLE (Slow Load Speed):
Subject: Your website takes too long to load
Body:
I came across your website and noticed it currently takes over ${loadTime} seconds to load. Most visitors will abandon a page if it takes longer than 4 seconds to open.

Every second of delay is a customer who gave up and clicked on a competitor instead. I am a Web Developer and SEO specialist who build fast, high-performance websites that rank and convert.

Fixing your load speed is one of the fastest ways to increase lead conversion without spending on ads. Reply if you'd like me to look at it.

Regards,
Hamdan Ahmad`;
    } else {
        exampleEmail = `
EXAMPLE (Automation / Software Opportunity):
Subject: How you could close more leads without extra work
Body:
I came across your website while researching ${industry || 'local businesses'} in ${city || 'your area'} and wanted to reach out.

Your online presence is solid — but most businesses in your area are still managing leads manually. I am a Software Engineer who builds automation software that handles your entire workload for you.

With this system, everything is done automatically so you can focus on earning while the tech handles the heavy lifting. Interested? Reply and let's explore what's possible.

Regards,
Hamdan Ahmad`;
    }

    const prompt = `### WHO YOU ARE
You are Hamdan Ahmad, a ${hasNoWebsite ? 'Experienced Web Developer who builds professional websites' : isNoIssue ? 'Software Engineer who builds automation software that simplifies business workflows' : 'Experienced Web Developer and SEO Specialist who ensures websites are fast, secure, and rank highly'}. You write direct, fluff-free cold outreach emails based in Pakistan.

### THE LEAD
- Business Name: ${businessName || 'this business'}
- Industry: ${industry || 'their industry'}
- City: ${city || 'their area'}
- Primary Issue (lead with this): ${primaryIssue}
- Primary Issue Detail: ${issueContext}${additionalIssues.length > 0 ? `
- Additional Issues Found (mention ALL of these professionally after the primary issue): ${additionalIssues.map((iss, i) => `\n  ${i + 1}. ${iss}`).join('')}` : ''}

### STRICT WRITING RULES
1. NEVER repeat the business name more than ONCE in the entire body. Use "you", "your", "your site" everywhere else.
2. Body = exactly 3 paragraphs, separated by blank lines (\\n\\n).
   - Para 1: Lead with the PRIMARY issue and its real-world consequence.${additionalIssues.length > 0 ? ' Also briefly reference the additional issues — do NOT bury them, mention them clearly.' : ''}
   - Para 2: Resolution for all issues found. MUST include your professional role (${hasNoWebsite ? 'Experienced Web Developer' : isNoIssue ? 'Software Engineer' : 'Web Developer and SEO specialist'}) where it makes sense.
   - Para 3: One single CTA line. Nothing else.
3. ${hasNoWebsite ? `Para 1 MUST start with: "I have been doing research into ${industry || 'local businesses'} in ${city || 'your area'} and noticed you don't have a website for your business yet."` : 'Para 1 MUST start with: "I came across your website..."'}
4. ${additionalIssues.length > 0 ? '95-130' : '85-110'} words total in body (excluding sign-off).
5. No emojis. No bold. No markdown. No explanatory notes.
6. After Para 3 (CTA), add: \\n\\nRegards,\\nHamdan Ahmad

### EXAMPLE TO FOLLOW CLOSELY
${exampleEmail}

### OUTPUT
Return ONLY valid JSON: { "subject": "...", "body": "..." }
Subject must include business name once and hint urgently at the issue.`;

    try {
        const response = await openai.chat.completions.create({
            model: 'meta-llama/llama-3.3-70b-instruct',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 700,
            response_format: { type: 'json_object' }
        });

        const result = parseAIResponse(response.choices[0].message.content.trim());
        return {
            subject: result.subject,
            body: polishBody(result.body)
        };
    } catch (error) {
        logger.error(`❌ Failed to generate AI outreach email: ${error.message}`);
        throw error;
    }
};

/**
 * Generates a story-driven 3-part follow-up email after 3 days
 * @param {object} lead - Full lead object
 * @returns {Promise<{subject: string, body: string}>}
 */
const generateFollowUpBody = async (lead) => {
    if (!openai) throw new Error('Llama API key missing. Cannot generate AI email.');

    const {
        name: businessName,
        leadType: industry,
        city,
        website,
        seoTitle,
        seoDescription,
        isResponsive
    } = lead;

    const isInsecure   = website && website.startsWith('http://');
    const hasNoWebsite = !website;
    const isWebsiteDown = !hasNoWebsite &&
        seoTitle && seoTitle.includes('Unreachable') &&
        seoDescription && seoDescription.includes('The website returned a server error');

    const siteLoadedFine = !hasNoWebsite && !isWebsiteDown;
    const firstMeaningfulWordFU = businessName
        ? businessName.toLowerCase().replace(/^(the|a|an)\s+/i, '').split(' ')[0]
        : '';
    const isSeoMisaligned  = siteLoadedFine && seoTitle && firstMeaningfulWordFU &&
        !seoTitle.toLowerCase().includes(firstMeaningfulWordFU);
    const isSeoDescMissing = siteLoadedFine && seoTitle && !seoDescription;
    const hasBadSeo        = isSeoMisaligned || isSeoDescMissing;

    // Determine what the original issue was so the follow-up can reference it specifically
    let originalIssueSummary = '';
    if (hasNoWebsite) {
        originalIssueSummary = `They have no website — every customer who searches for them online finds nothing and moves on to a competitor.`;
    } else if (isWebsiteDown) {
        originalIssueSummary = `Their website was returning a server error. Every day it stays broken is another day of silent lead loss.`;
    } else if (isResponsive === false) {
        originalIssueSummary = `Their site doesn't work on mobile — where the majority of their customers browse. This is quietly costing them leads every single day.`;
    } else if (hasBadSeo) {
        originalIssueSummary = `Their SEO metadata doesn't match their business, so Google isn't ranking them correctly for local searches they should be winning.`;
    } else if (isInsecure) {
        originalIssueSummary = `Their site runs on http and is flagged as "Not Secure" by every browser — most visitors leave before reading a word.`;
    } else {
        originalIssueSummary = `Most ${industry || 'businesses'} in ${city || 'their area'} are leaving leads on the table by running everything manually instead of using automated systems.`;
    }

    // --- Scenario-specific follow-up example ---
    let exampleFollowUp = '';

    if (hasNoWebsite) {
        exampleFollowUp = `
EXAMPLE:
Subject: Following up — ${businessName}
Body:
I sent you a note a few days ago and wanted to circle back in case it got buried.

Every day without a website is another day customers who search for your service find nothing — and call someone else instead. That gap is easy to close and I can help you with that.

Want to take 10 minutes to see what it could look like? Reply and let's talk.

Regards,
Hamdan Ahmad`;
    } else if (isWebsiteDown) {
        exampleFollowUp = `
EXAMPLE:
Subject: Still checking in — your website
Body:
Just following up on my last note. Didn't want it to slip through the cracks.

When I reached out, your site was returning a server error — if it's still not fully sorted, every day it stays that way hands leads to your competitors silently. These things are usually a quick fix.

Reply and I'll take a look today.

Regards,
Hamdan Ahmad`;
    } else if (hasBadSeo) {
        exampleFollowUp = `
EXAMPLE:
Subject: Following up — your Google visibility
Body:
Just circling back to see if you had a chance to read my last note.

Your SEO still isn't reflecting your business properly — which means Google is ranking competitors above you for local searches you should be winning. This is one of the easiest things to fix and I can help you with it.

Worth a 10-minute conversation? Reply and let's get into it.

Regards,
Hamdan Ahmad`;
    } else if (isInsecure) {
        exampleFollowUp = `
EXAMPLE:
Subject: Following up — site security
Body:
Just following up on my previous note in case it got lost.

Your site is still flagged as "Not Secure" by every browser — most visitors leave before they even read your page. Moving to HTTPS is a quick win that builds trust immediately and stops this silent leak.

Interested? Reply and I'll walk you through it.

Regards,
Hamdan Ahmad`;
    } else {
        exampleFollowUp = `
EXAMPLE:
Subject: Following up — ${businessName}
Body:
I sent you a quick note a few days ago and wanted to check in.

Most ${industry || 'businesses'} in ${city || 'your area'} are still handling lead generation manually — and consistently leaving revenue on the table because of it. I build systems that run in the background to find and follow up with new customers automatically.

If that sounds worth exploring, reply and let's talk.

Regards,
Hamdan Ahmad`;
    }

    const prompt = `### WHO YOU ARE
You are Hamdan Ahmad, following up 3 days after your first cold email to ${businessName}.

### THE LEAD
- Business: ${businessName}
- Industry: ${industry || 'their industry'}
- City: ${city || 'their area'}
- Original Issue: ${originalIssueSummary}

### FOLLOW-UP STRUCTURE — 3 PARAGRAPHS
- Para 1: Human, warm re-introduction. Just circling back, not pushy. 1-2 sentences.
- Para 2: Short, specific reminder of the original issue and what it is silently costing them right now. This is the VALUE paragraph — make it feel real. 2-3 sentences.
- Para 3: One direct, low-friction CTA line. Nothing else.

### STRICT WRITING RULES
1. NEVER repeat the business name more than ONCE in the body. Use "you", "your", "your business" everywhere else.
2. 3 paragraphs separated by blank lines (\\n\\n).
3. Tone: Human, direct, zero fluff. No corporate-speak.
4. 60-80 words total (excluding sign-off).
5. No emojis. No bold. No markdown.
6. After Para 3 (CTA), add: \\n\\nRegards,\\nHamdan Ahmad

### EXAMPLE TO FOLLOW CLOSELY
${exampleFollowUp}

### OUTPUT
Return ONLY valid JSON: { "subject": "...", "body": "..." }`;

    try {
        const response = await openai.chat.completions.create({
            model: 'meta-llama/llama-3.3-70b-instruct',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 500,
            response_format: { type: 'json_object' }
        });

        const result = parseAIResponse(response.choices[0].message.content.trim());
        return {
            subject: result.subject,
            body: polishBody(result.body)
        };
    } catch (error) {
        logger.error(`❌ Failed to generate AI follow up email: ${error.message}`);
        throw error;
    }
};

module.exports = {
    generateOutreachBody,
    generateFollowUpBody
};

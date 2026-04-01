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
            max_tokens: 800,
            response_format: { type: 'json_object' }
        });
        return response.choices[0].message.content.trim();
    } catch (err) {
        logger.warn(`⚠️ Primary AI Client failed: ${err.message}. Trying Secondary...`);
        if (clientSecondary && keySecondary !== keyPrimary) {
            const response = await clientSecondary.chat.completions.create({
                model: model,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 800,
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

// Helper to clean business names (strips city/state suffixes often found in scraper data)
const cleanName = (name) => {
    if (!name) return '';
    return name
        .replace(/[\r\n]+/g, ' ')
        // Strips " - Miami", " | New York FL.", etc. from the end of the name
        .replace(/\s*[-–|@]\s*(miami|new york|chicago|houston|los angeles|dallas|phoenix|philadelphia|san antonio|san diego|[a-z\s]{3,20}),?\s*(fl|tx|ca|ny|az|il|pa|nj)?\.?$/i, '')
        .replace(/\s+/g, ' ')
        .trim();
};

/**
 * Strips any sign-off variation and appends guaranteed correct format
 */
const polishBody = (body) => {
    if (!body) return body;
    body = body.trim().replace(/^"+|"+$/g, '').trim();
    
    // 1. Force Greeting Line Break
    if (body.toLowerCase().startsWith('hi,')) {
        const firstLineMatch = body.match(/^hi,([^\n]*)\n?/i);
        if (firstLineMatch) {
            const greeting = firstLineMatch[0].trim();
            const rest = body.substring(greeting.length).trim();
            body = 'Hi,\n' + rest;
        }
    }

    // 2. Clear out any existing "Regards" blocks to rewrite them
    body = body.replace(/[\n\r\s]*regards,?[\n\r\s]*hamdan ahmad[\n\r\s]*/gi, '').trim();
    
    // 3. Ensure double line breaks between paragraphs
    // If AI sent single line breaks, convert them to doubles
    if (!body.includes('\n\n')) {
        body = body.replace(/\n/g, '\n\n');
    }

    // 4. Append forced sign-off structure
    body = body + '\n\nRegards,\nHamdan Ahmad';
    
    return body.trim();
};

// ─── MASTER TEMPLATES (user's exact words — AI only rephrases these) ──────────
const getTemplate = (scenario, businessName, city, loadTime) => {
    const load = loadTime ? `${loadTime}s` : 'several seconds';
    const loc = city || 'your area';

    // Roles for context-aware professional lines
    const roles = {
        BAD_SEO: 'web developer and SEO specialist',
        SEO_AND_SPEED: 'web developer',
        SLOW_LOAD: 'web developer',
        INSECURE: 'web developer',
        INSECURE_ALL: 'web developer',
        INSECURE_SEO: 'web developer',
        INSECURE_SLOW: 'web developer',
        WEBSITE_DOWN: 'web developer',
        NO_WEBSITE: 'web developer',
        MOBILE: 'web developer',
        AUTOMATION: 'software engineer'
    };
    const role = roles[scenario] || 'software engineer';

    const templates = {
        AUTOMATION: {
            subject: `${businessName} — something your competitors are doing`,
            body: `Hi,

I noticed ${businessName}'s website is ahead of most, but you're missing a key automation gap. Competitors who automate their follow-ups are closing 40-60% more business from the exact same traffic you already have.

I’m a ${role} and I specialize in turning existing traffic into booked business. 

If you'd like, I can show you how to close this gap today.`
        },

        BAD_SEO: {
            subject: `${businessName} — Google is showing it to almost nobody`,
            body: `Hi,

I noticed ${businessName} has a real business, but Google is showing it to almost nobody. Customers in ${loc} are searching for you right now, but they're finding your competitors because of a few tiny technical missing pieces on your site.

I’m a ${role} and fixing these visibility issues is exactly what I do.

If you'd like, I can show you exactly what Google can't see today.`
        },

        SEO_AND_SPEED: {
            subject: `${businessName} is losing customers to competitors`,
            body: `Hi,

I noticed ${businessName} is losing customers to fast competitors right now. Your site takes ${load} to load, and your SEO is incomplete. Google sees this and quietly moves faster businesses above you.

I’m a ${role} and I specialized in getting websites working exactly how they should be.

If you'd like, I can show you exactly how to fix both today.`
        },

        INSECURE: {
            subject: `${businessName} — website shows a "Not Secure" warning`,
            body: `Hi,

I noticed ${businessName}'s website shows a “Not Secure” warning on Google. Most visitors close sites immediately when they see this warning before they even read a word.

I’m a ${role} and fixing this is usually very quick.

If you'd like, I can show you exactly what's causing it.`
        },

        INSECURE_ALL: {
            subject: `${businessName} — website has a few roadblocks`,
            body: `Hi,

I noticed ${businessName}'s website is flagged as insecure, takes ${load} to load, and Google isn't finding it in ${loc}. These three separate problems are compounding and silently moving your customers to competitors.

I’m a ${role} and I can resolve all three today so your site works the way it should.

If you'd like, I can send you a full breakdown today.`
        },

        WEBSITE_DOWN: {
            subject: `${businessName} — website is currently down`,
            body: `Hi,

I noticed ${businessName}'s website is currently down and unreachable. Every hour it stays down, customers searching for your service in ${loc} hit a dead end and call your competitors instead.

I’m a ${role} and I can get it back up quickly for you.

If you'd like, I can look into it today.`
        },

        SLOW_LOAD: {
            subject: `${businessName} — website is losing visitors to load time`,
            body: `Hi,

I noticed ${businessName}'s website takes ${load} to load. Most visitors abandon a page within seconds if it's slow, and Google quietly ranks faster competitors above you in ${loc} as a result.

I’m a ${role} and making sites fast enough to convert visitors is my specialty.

If you'd like, I can show you exactly how to fix it today.`
        },

        NO_WEBSITE: {
            subject: `${businessName} — customers searching for you can't find you`,
            body: `Hi,

I noticed ${businessName} doesn't have a website yet. 81% of customers research businesses online first, so without one you're invisible to almost every customer searching in ${loc}.

I’m a ${role} and I build professional sites that get small businesses in front of local customers.

If you'd like, I can get you live and showing up in searches within 7 days.`
        },

        MOBILE: {
            subject: `${businessName} — visitors on mobile are having a hard time`,
            body: `Hi,

I noticed ${businessName}'s website works on desktop but is broken for mobile visitors. Over 60% of people finding you use their phones, and right now they're getting a broken, hard-to-navigate experience that sends them straight to a competitor.

I’m a ${role} and I specialized in building mobile-first sites that actually convert.

If you'd like, I can show you what your visitors on mobile are seeing right now.`
        },

        INSECURE_SEO: {
            subject: `${businessName} — website has a few technical gaps`,
            body: `Hi,

I noticed ${businessName}'s website has a "Not Secure" warning and Google isn't properly indexing you for searches in ${loc}. These two gaps are silently costing you customers every single day.

I’m a ${role} and I specialize in fixing these exact problems for local businesses.

If you'd like, I can show you how to resolve both today.`
        },

        INSECURE_SLOW: {
            subject: `${businessName} — website has a few roadblocks`,
            body: `Hi,

I noticed ${businessName}'s website is flagged as insecure and takes ${load} to load. Most visitors leave the moment they see the browser warning or the slow load time before they ever see what you offer.

I’m a ${role} and I specialize in getting websites working properly for the business.

If you'd like, I can show you how to fix both today.`
        }
    };

    return templates[scenario] || templates['AUTOMATION'];
};

// ─── SCENARIO DETECTION ───────────────────────────────────────────────────
const detectScenario = (lead) => {
    const { website, seoTitle, seoDescription, isResponsive, loadTime, name: businessName } = lead;

    const isInsecure    = website && website.startsWith('http://');
    const hasNoWebsite  = !website;
    const isWebsiteDown = !hasNoWebsite &&
        seoTitle && (seoTitle.includes('Unreachable') || seoTitle.includes('Scrape Failed') || seoTitle.includes('Error')) &&
        seoDescription && (seoDescription.includes('server error') || seoDescription.includes('ERR_') || seoDescription.includes('Failed to load') || seoDescription.includes('net::ERR'));

    const siteLoadedFine = !hasNoWebsite && !isWebsiteDown;

    const firstMeaningfulWord = businessName ? businessName.toLowerCase().replace(/^(the|a|an)\s+/i, '').split(' ')[0] : '';
    const isSeoMisaligned  = siteLoadedFine && seoTitle && firstMeaningfulWord && !seoTitle.toLowerCase().includes(firstMeaningfulWord);
    const isSeoDescMissing = siteLoadedFine && (!seoTitle || !seoDescription);
    const hasBadSeo        = isSeoMisaligned || isSeoDescMissing;

    const isSlowLoad = siteLoadedFine && loadTime && loadTime > 4.5;
    const isMobile   = isResponsive === false;

    if (hasNoWebsite)                                    return 'NO_WEBSITE';
    if (isWebsiteDown)                                   return 'WEBSITE_DOWN';
    if (isInsecure && hasBadSeo && isSlowLoad)           return 'INSECURE_ALL';
    if (isInsecure && hasBadSeo)                         return 'INSECURE_SEO';
    if (isInsecure && isSlowLoad)                        return 'INSECURE_SLOW';
    if (isInsecure)                                      return 'INSECURE';
    if (hasBadSeo && isSlowLoad)                         return 'SEO_AND_SPEED';
    if (hasBadSeo)                                       return 'BAD_SEO';
    if (isSlowLoad)                                      return 'SLOW_LOAD';
    if (isMobile)                                        return 'MOBILE';
    return 'AUTOMATION';
};

/**
 * Outreach Body Generator
 */
const generateOutreachBody = async (lead) => {
    if (!clientPrimary) throw new Error('AI API keys missing. Cannot generate AI email.');

    const businessName = cleanName(lead.name);
    const { city, loadTime } = lead;
    const scenario = detectScenario(lead);
    const template = getTemplate(scenario, businessName, city, loadTime);

    logger.info(`📧 Generating email for "${businessName}" | Scenario: ${scenario}`);

    const prompt = `### TASK
You are Hamdan Ahmad, a direct and busy developer. Your only job is to REPHRASE the provided email template by making ONLY MINOR CHANGES. It must always sound human-like and use casual words.

### RULES
1. ONLY MINOR REPHRASING. Keep the core structure and tone identical.
2. DO NOT change stats or business names.
3. SUBJECT ALWAYS STARTS WITH THE BUSINESS NAME.
4. Keep the "Hi," greeting on its OWN LINE with a line break AFTER it.
5. Every logical part (Problem, Who/Role, CTA) MUST have a blank line (Double Line Break) between them.
6. DO NOT use emojis or corporate fluff.
7. DO NOT use words like: "outstand", "leverage", "boost", "skyrocket".
8. Target 60-70 words total.

### THE TEMPLATE TO REPHRASE
Subject: ${template.subject}

Body:
${template.body}

### OUTPUT
Return ONLY valid JSON: { "subject": "...", "body": "..." }`;

    try {
        const textContent = await callAICompletion(prompt);
        const result = parseAIResponse(textContent);
        return {
            subject: result.subject || template.subject,
            body: polishBody(result.body || template.body)
        };
    } catch (error) {
        logger.error(`❌ AI generation failed, using raw template: ${error.message}`);
        return {
            subject: template.subject,
            body: polishBody(template.body)
        };
    }
};

/**
 * Follow-up Body Generator 
 */
const generateFollowUpBody = async (lead) => {
    if (!clientPrimary) throw new Error('AI API keys missing. Cannot generate AI email.');

    const businessName = cleanName(lead.name);
    const { city, loadTime } = lead;
    const scenario = detectScenario(lead);
    const loc = city || 'your area';
    const load = loadTime ? `${loadTime}s` : 'several seconds';

    const followUpTemplates = {
        AUTOMATION: {
            subject: `${businessName} — just following up`,
            body: `Hi,

I sent a note a few days ago about the automation gap on your site. Competitors using this are closing 40-60% more business from the same visitors you already have while you're busy.

Still happy to show you how to close it today. Reply if you'd like to chat.`
        },
        BAD_SEO: {
            subject: `${businessName} — Google still can't see you`,
            body: `Hi,

I sent a note a few days ago about your visibility on Google. Right now, customers in ${loc} are searching for you and finding your competitors because of those technical missing pieces I mentioned.

Still happy to show you exactly what Google can't see. Just reply.`
        },
        WEBSITE_DOWN: {
            subject: `${businessName} — site still unreachable`,
            body: `Hi,

I sent a note a few days ago about your website being unreachable. Every hour it stays down, you're losing customers in ${loc} to competitors who actually have working links.

Still happy to look into it for you today. Just reply.`
        },
        SEO_AND_SPEED: {
            subject: `${businessName} — still two things costing you customers`,
            body: `Hi,

Just circling back on my note about your site speed and SEO. Those two gaps together mean most potential customers are landing on faster competitors instead.

Happy to send you a full breakdown today if you'd like to fix it. Just reply.`
        },
        INSECURE: {
            subject: `${businessName} — the "not secure" warning is still there`,
            body: `Hi,

Just following up on that security warning on your site. It's still driving visitors away before they ever see what you offer. It's a quick technical fix that builds immediate trust.

I can show you exactly how to fix it today if you're interested. Just reply.`
        },
        INSECURE_ALL: {
            subject: `${businessName} — those roadblocks are still there`,
            body: `Hi,

Just circling back on those technical gaps I noticed. The security warning, slow load time, and SEO gaps are all still compounding and costing you customers daily in ${loc}.

Still happy to send you a full breakdown today. Just reply.`
        },
        INSECURE_SEO: {
            subject: `${businessName} — still hard to find and flagged as insecure`,
            body: `Hi,

I sent a note a few days ago about those technical gaps. Your site is still showing the security warning and Google still isn't indexing you properly in ${loc}.

Happy to walk you through exactly how I'd fix both today. Just reply.`
        },
        INSECURE_SLOW: {
            subject: `${businessName} — security warning and load time still there`,
            body: `Hi,

Just circling back on those roadblocks. The browser warning and the load time together mean almost nobody who finds you is actually making it through to see your business.

I can show you how to fix both today if you'd like. Just reply.`
        },
        SLOW_LOAD: {
            subject: `${businessName} — load time is still costing you`,
            body: `Hi,

Just following up on your site speed. At ${load}, Google is still quietly ranking faster competitors above you in ${loc}, and most visitors are leaving before your page even finishes.

Happy to send you a full breakdown today. Just reply.`
        },
        NO_WEBSITE: {
            subject: `${businessName} — still no website, still invisible online`,
            body: `Hi,

I sent a note a few days ago about building a site for ${businessName}. Without one, you're invisible to the 81% of customers researching businesses in ${loc} before they call.

I can still have you live in 7 days. Reply if you're interested.`
        },
        MOBILE: {
            subject: `${businessName} — mobile visitors are still leaving`,
            body: `Hi,

Just circling back on your mobile experience. Over 60% of people finding you in ${loc} are on their phones, and they're still getting the broken experience I mentioned.

Happy to show you exactly what they're seeing today. Just reply.`
        }
    };

    const followUp = followUpTemplates[scenario] || followUpTemplates['AUTOMATION'];

    const prompt = `### TASK
You are Hamdan Ahmad. Rephrase this follow-up to sound short, human, and zero-pressure.

### RULES
1. SUBJECT ALWAYS STARTS WITH THE BUSINESS NAME.
2. Keep the "Hi," greeting on its OWN LINE with a line break AFTER it.
3. Every logical part MUST have a blank line (Double Line Break) between them.
4. Keep 40-60 words total across all paragraphs.
5. NO "AI" fluff words (leverage, empower, boost, etc.)

### TEMPLATE
Subject: ${followUp.subject}

Body:
${followUp.body}

### OUTPUT
Return ONLY valid JSON: { "subject": "...", "body": "..." }`;

    try {
        const textContent = await callAICompletion(prompt);
        const result = parseAIResponse(textContent);
        return {
            subject: result.subject || followUp.subject,
            body: polishBody(result.body || followUp.body)
        };
    } catch (error) {
        return {
            subject: followUp.subject,
            body: polishBody(followUp.body)
        };
    }
};

/**
 * Uses AI to rank emails by decision-maker value
 */
const rankEmailsWithAI = async (businessName, emails) => {
    if (!emails || emails.length <= 1) return emails || [];

    const prompt = `### TASK
Rank these emails from most to least valuable for cold outreach to ${businessName}. Most valuable = directly reaches a decision maker (owner, founder, CEO).

### EMAILS
${emails.map((e, i) => `${i + 1}. ${e}`).join('\n')}

### RANKING RULES
1. Personal name emails (john@, j.smith@) = highest value.
2. Business domain emails beat generic providers (@gmail, @yahoo).
3. Generic inboxes (info@, contact@, office@, reception@) = lowest value.

### OUTPUT
Return ONLY a valid JSON array in ranked order: ["best@...", "second@...", ...]`;

    try {
        const response = await callAICompletion(prompt);
        const ranked = parseAIResponse(response);
        return Array.isArray(ranked) ? ranked : emails;
    } catch (error) {
        return emails;
    }
};

module.exports = {
    generateOutreachBody,
    generateFollowUpBody,
    rankEmailsWithAI
};

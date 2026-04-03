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
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        if (start === -1 || end === -1) throw new Error('No JSON found');
        return JSON.parse(text.slice(start, end + 1));
    } catch (error) {
        logger.error(`❌ AI JSON Parse Error: ${error.message}. Content: ${text.substring(0, 100)}...`);
        throw new Error('Could not parse AI response as JSON');
    }
};

const cleanName = (name) => {
    if (!name) return '';
    return name
        .replace(/[\r\n]+/g, ' ')
        .replace(/\s*[-–|@]\s*(miami|new york|chicago|houston|los angeles|dallas|phoenix|philadelphia|san antonio|san diego|[a-z\s]{3,20}),?\s*(fl|tx|ca|ny|az|il|pa|nj)?\.?$/i, '')
        .replace(/\s+/g, ' ')
        .trim();
};

const polishBody = (body) => {
    if (!body) return body;
    body = body.trim().replace(/^"+|"+$/g, '').trim();
    
    if (body.toLowerCase().startsWith('hi,')) {
        const firstLineMatch = body.match(/^hi,([^\n]*)\n?/i);
        if (firstLineMatch) {
            const greeting = firstLineMatch[0].trim();
            const rest = body.substring(greeting.length).trim();
            body = 'Hi,\n' + rest;
        }
    }

    body = body.replace(/[\n\r\s]*regards,?[\n\r\s]*hamdan ahmad[\n\r\s]*/gi, '').trim();
    
    if (!body.includes('\n\n')) {
        body = body.replace(/\n/g, '\n\n');
    }

    body = body + '\n\nRegards,\nHamdan Ahmad';
    
    return body.trim();
};

const getTemplate = (scenario, businessName, city, loadTime) => {
    const load = loadTime ? `${loadTime}s` : 'several seconds';
    const loc = city || 'your area';

    const templates = {
        AUTOMATION: {
            subject: `${businessName} — your online presence is solid, here's what's next`,
            body: `Hi,

${businessName}'s site is genuinely ahead of most businesses I come across — fast, clean, visible.

What I build for businesses at this stage is a system that turns that presence into booked leads automatically. Follow-ups, outreach, and lead management running on their own while you just monitor.

Worth a 10-minute conversation?`
        },

        BAD_SEO: {
            subject: `${businessName} — Google is sending your customers elsewhere`,
            body: `Hi,

${businessName}'s site is live but Google isn't ranking it for searches in ${loc}. Customers looking for exactly what you offer are finding competitors instead — not because competitors are better, but because their SEO is structured correctly and yours isn't.

I'm a web developer and I fix this exact problem. One of my recent clients went from invisible to page one in their local area within weeks.

Worth a 10-minute conversation?`
        },

        SEO_AND_SPEED: {
            subject: `${businessName} — two things sending customers to competitors`,
            body: `Hi,

${businessName}'s site takes ${load} to load and Google isn't ranking it properly in ${loc}. These two problems feed each other — slow sites rank lower, lower ranking means less traffic, less traffic means fewer customers finding you.

I'm a web developer and I've fixed this exact combination before. Both are quicker to solve than most people expect.

Worth a 10-minute conversation?`
        },

        INSECURE: {
            subject: `${businessName} — visitors see a warning before they see your business`,
            body: `Hi,

I checked ${businessName}'s site and browsers are showing a "Not Secure" warning to every visitor. Most people see that and leave straight away — they never even get to see what your business actually offers.

I'm a web developer and I've fixed this for businesses before. Right now it's costing you customers every single day.

Worth a 10-minute conversation?`
        },

        INSECURE_ALL: {
            subject: `${businessName} — three things quietly costing you customers`,
            body: `Hi,

I checked ${businessName}'s site and browsers are showing a "Not Secure" warning, it takes ${load} to load, and Google isn't ranking it in ${loc}. Each one on its own loses customers — together they make it worse.

I'm a web developer and I've fixed this exact combination before. All three are quicker to solve than most people expect.

Worth a 10-minute conversation?`
        },

        WEBSITE_DOWN: {
            subject: `${businessName} — your website is down right now`,
            body: `Hi,

I just checked ${businessName}'s site and it's completely unreachable. Anyone searching for you in ${loc} right now is hitting a dead end and calling your competitors instead.

I'm a web developer and getting sites back up fast is something I've done before. The longer it stays down the more customers you lose today.

Worth a quick call?`
        },

        SLOW_LOAD: {
            subject: `${businessName} — your site is losing visitors to load time`,
            body: `Hi,

${businessName}'s site takes ${load} to load. Most visitors leave within seconds if a page is slow, and Google quietly ranks faster competitors above you in ${loc} as a result.

I'm a web developer and making sites fast is something I specialize in. This is quicker to fix than most people expect.

Worth a 10-minute conversation?`
        },

        NO_WEBSITE: {
            subject: `${businessName} — customers in ${loc} can't find you online`,
            body: `Hi,

I looked up ${businessName} and couldn't find a website. Most people in ${loc} search online before they call anyone — right now they're finding your competitors instead of you.

I'm a web developer and I build clean professional sites that show up in local searches. I've done this for businesses similar to yours.

Worth a 10-minute conversation?`
        },

        MOBILE: {
            subject: `${businessName} — mobile visitors are having a hard time`,
            body: `Hi,

${businessName}'s site works on desktop but is broken for mobile visitors. Over 60% of people finding you use their phones, and right now they're getting a broken experience that sends them straight to a competitor.

I'm a web developer and I've fixed this for businesses before. Mobile traffic is too valuable to lose.

Worth a 10-minute conversation?`
        },

        INSECURE_SEO: {
            subject: `${businessName} — visitors don't trust it and Google can't find it`,
            body: `Hi,

I checked ${businessName}'s site and browsers are showing a "Not Secure" warning, and Google isn't ranking it properly in ${loc}. These two problems feed each other — insecure sites rank lower, lower ranking means less traffic.

I'm a web developer and I've fixed this exact combination before. Both are quicker to solve than most people expect.

Worth a 10-minute conversation?`
        },

        INSECURE_SLOW: {
            subject: `${businessName} — visitors are leaving before they see your business`,
            body: `Hi,

I checked ${businessName}'s site and browsers are showing a "Not Secure" warning, and it takes ${load} to load. Most visitors leave the moment they see the browser warning or the slow load time before they ever see what you offer.

I'm a web developer and I've fixed this exact combination before. Both are quicker to solve than most people expect.

Worth a 10-minute conversation?`
        }
    };

    return templates[scenario] || templates['AUTOMATION'];
};

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

const generateOutreachBody = async (lead) => {
    if (!clientPrimary) throw new Error('AI API keys missing. Cannot generate AI email.');

    const businessName = cleanName(lead.name);
    const { city, loadTime } = lead;
    const scenario = detectScenario(lead);
    const template = getTemplate(scenario, businessName, city, loadTime);

    logger.info(`📧 Generating email for "${businessName}" | Scenario: ${scenario}`);

    const prompt = `### TASK
You are Hamdan Ahmad. Your ONLY job is to rephrase this email template by changing ONLY 5-10% of the words — specifically helper words like "is", "am", "are", "was", "were", "has", "have", "will", "can", "could", "would". DO NOT change actual content words, business names, numbers, or the core message.

### RULES
1. Change ONLY 5-10% — helper/linking words like is/am/are/was/were/has/have/will/can/could/would
2. DO NOT change: business names, numbers, statistics, city names, technical terms, or any meaningful content words
3. Keep subject line EXACTLY as provided
4. Keep "Hi," greeting on its OWN LINE with line break after it
5. Keep all paragraph breaks exactly as they are (double line breaks between paragraphs)
6. Keep 3-4 paragraphs maximum
7. DO NOT add emojis or corporate words like "leverage", "boost", "skyrocket", "outstanding"
8. The email must remain 60-80 words total

### THE TEMPLATE TO REPHRASE (change only 5-10% helper words)
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

I sent a note a few days ago about the automation gap on your site. Competitors using this are getting more from the same traffic you already have while you're busy.

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

Just following up on that security warning on your site. Every day it stays there, visitors are leaving before they ever see what you offer.

I can show you exactly how to fix it today if you're interested. Just reply.`
        },
        INSECURE_ALL: {
            subject: `${businessName} — those roadblocks are still there`,
            body: `Hi,

Just circling back on those technical gaps I noticed. The security warning, slow load time, and SEO gaps are all still there — and still sending customers to competitors in ${loc} every day.

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
            subject: `${businessName} — customers in ${loc} still can't find you`,
            body: `Hi,

I sent a note a few days ago about ${businessName} not having a website. Most people in ${loc} search online before they call anyone — right now every one of them is finding your competitors instead.

Still happy to help you get online. Just reply.`
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

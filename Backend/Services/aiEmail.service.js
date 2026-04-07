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

const getNicheTerminology = async (lead) => {
    // If we have clear indicators, use them for speed
    const name = lead.name ? lead.name.toLowerCase() : '';
    const leadType = lead.leadType ? lead.leadType.toLowerCase() : '';
    const combined = `${name} ${leadType}`;
    
    // Quick hardcoded fallbacks for obvious cases
    if (combined.includes('dent')) return 'patients';
    if (combined.includes('law') || combined.includes('legal') || combined.includes('attorney')) return 'clients';
    if (combined.includes('medical') || combined.includes('doctor') || combined.includes('clinic')) return 'patients';
    
    // Otherwise, let AI decide based on business context
    if (!clientPrimary) return 'customers'; // Fallback if AI unavailable
    
    try {
        const prompt = `### TASK
Based on this business information, determine if they serve "customers", "clients", or "patients".

### BUSINESS INFO
Name: ${lead.name || 'Unknown'}
Type: ${lead.leadType || 'Unknown'}
Website: ${lead.website || 'N/A'}

### RULES
- Use "patients" for healthcare/dental/medical businesses
- Use "clients" for professional services (law, consulting, accounting, real estate, agencies)
- Use "customers" for retail, restaurants, e-commerce, general services

### OUTPUT
Return ONLY valid JSON: { "term": "customers" } or { "term": "clients" } or { "term": "patients" }`;

        const response = await callAICompletion(prompt, 'meta-llama/llama-3.3-70b-instruct');
        const result = parseAIResponse(response);
        
        const term = result.term?.toLowerCase();
        if (term === 'patients' || term === 'clients' || term === 'customers') {
            return term;
        }
        return 'customers'; // Safe fallback
    } catch (error) {
        logger.warn(`⚠️ AI terminology detection failed: ${error.message}. Using 'customers'.`);
        return 'customers';
    }
};

const getTemplate = (scenario, businessName, city, loadTime, customerTerm = 'customers') => {
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
            subject: `${businessName} — Google is sending your ${customerTerm} elsewhere`,
            body: `Hi,

${businessName}'s site is live but Google isn't ranking it for searches in ${loc}. ${customerTerm.charAt(0).toUpperCase() + customerTerm.slice(1)} looking for exactly what you offer are finding competitors instead — not because competitors are better, but because their SEO is structured correctly and yours isn't.

I'm a web developer and I fix this exact problem. One of my recent clients went from invisible to page one in their local area within weeks.

Worth a 10-minute conversation?`
        },

        SEO_AND_SPEED: {
            subject: `${businessName} — two things sending ${customerTerm} to competitors`,
            body: `Hi,

${businessName}'s site takes ${load} to load and Google isn't ranking it properly in ${loc}. These two problems feed each other — slow sites rank lower, lower ranking means less traffic, less traffic means fewer ${customerTerm} finding you.

I'm a web developer and I've fixed this exact combination before. Both are quicker to solve than most people expect.

Worth a 10-minute conversation?`
        },

        INSECURE: {
            subject: `${businessName} — visitors see a warning before they see your business`,
            body: `Hi,

I checked ${businessName}'s site and browsers are showing a "Not Secure" warning to every visitor. Most people see that and leave straight away — they never even get to see what your business actually offers.

I'm a web developer and I've fixed this for businesses before. Right now it's costing you ${customerTerm} every single day.

Worth a 10-minute conversation?`
        },

        INSECURE_ALL: {
            subject: `${businessName} — three things quietly costing you ${customerTerm}`,
            body: `Hi,

I checked ${businessName}'s site and browsers are showing a "Not Secure" warning, it takes ${load} to load, and Google isn't ranking it in ${loc}. Each one on its own loses ${customerTerm} — together they make it worse.

I'm a web developer and I've fixed this exact combination before. All three are quicker to solve than most people expect.

Worth a 10-minute conversation?`
        },

        WEBSITE_DOWN: {
            subject: `${businessName} — your website is down right now`,
            body: `Hi,

I just checked ${businessName}'s site and it's completely unreachable. Anyone searching for you in ${loc} right now is hitting a dead end and calling your competitors instead.

I'm a web developer and getting sites back up fast is something I've done before. The longer it stays down the more ${customerTerm} you lose today.

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
    const customerTerm = await getNicheTerminology(lead); // Now async
    const template = getTemplate(scenario, businessName, city, loadTime, customerTerm);

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

const generateSecondFollowUpBody = async (lead) => {
    if (!clientPrimary) throw new Error('AI API keys missing. Cannot generate AI email.');

    const businessName = cleanName(lead.name);
    const { city } = lead;
    const scenario = detectScenario(lead);
    const loc = city || 'your area';
    const customerTerm = await getNicheTerminology(lead); // Now async

    const secondFollowUpTemplates = {
        AUTOMATION: {
            subject: `${businessName} — last check-in`,
            body: `Hi,

Last note on this. If automation isn't a priority right now, no worries. Just wanted to check in one final time.

Reply if you want to talk.`
        },
        BAD_SEO: {
            subject: `${businessName} — final note on SEO`,
            body: `Hi,

Last note. Your competitors in ${loc} are ranking because their SEO is set up right. This is fixable.

Reply if you want yours fixed.`
        },
        WEBSITE_DOWN: {
            subject: `${businessName} — site status`,
            body: `Hi,

Final check. If your site's still down, ${customerTerm} are going elsewhere. I can help get it back up.

Reply if you need help.`
        },
        SEO_AND_SPEED: {
            subject: `${businessName} — last note`,
            body: `Hi,

Final note on speed and SEO. Both are fixable fast and the impact is immediate once done.

Reply if you're interested.`
        },
        INSECURE: {
            subject: `${businessName} — security warning`,
            body: `Hi,

Last note. That warning is still turning visitors away before they see what you offer.

Reply if you want it fixed.`
        },
        INSECURE_ALL: {
            subject: `${businessName} — final note`,
            body: `Hi,

Last check-in. Security, speed, and SEO are all fixable. Each one is costing you business right now.

Reply if you're ready.`
        },
        INSECURE_SEO: {
            subject: `${businessName} — last note`,
            body: `Hi,

Final note. Security and SEO are both holding you back from ranking and getting traffic.

Reply if you want them fixed.`
        },
        INSECURE_SLOW: {
            subject: `${businessName} — final check`,
            body: `Hi,

Last note. Warning and speed are both costing you ${customerTerm}. Both are quick fixes.

Reply if you're interested.`
        },
        SLOW_LOAD: {
            subject: `${businessName} — site speed`,
            body: `Hi,

Final note on speed. It's fixable in days, not weeks, and visitors will notice immediately.

Reply if you want it done.`
        },
        NO_WEBSITE: {
            subject: `${businessName} — online presence`,
            body: `Hi,

Last note. ${loc} ${customerTerm} are searching online and finding competitors. You're missing out daily.

Reply if you're ready for a site.`
        },
        MOBILE: {
            subject: `${businessName} — mobile site`,
            body: `Hi,

Final note. 60% of your traffic is on mobile and it's broken. That's a lot of lost business.

Reply if you want it working.`
        }
    };

    const secondFollowUp = secondFollowUpTemplates[scenario] || secondFollowUpTemplates['AUTOMATION'];

    const prompt = `### TASK
You are Hamdan Ahmad. This is the FINAL follow-up. Rephrase to be respectful and give them an easy out.

### RULES
1. SUBJECT ALWAYS STARTS WITH THE BUSINESS NAME.
2. Keep the "Hi," greeting on its OWN LINE with a line break AFTER it.
3. Keep 40-50 words total — brief and respectful.
4. Acknowledge this is the last message.
5. NO pressure, NO "AI" fluff words.
6. End with "Reply if you want [action]."

### TEMPLATE
Subject: ${secondFollowUp.subject}

Body:
${secondFollowUp.body}

### OUTPUT
Return ONLY valid JSON: { "subject": "...", "body": "..." }`;

    try {
        const textContent = await callAICompletion(prompt);
        const result = parseAIResponse(textContent);
        return {
            subject: result.subject || secondFollowUp.subject,
            body: polishBody(result.body || secondFollowUp.body)
        };
    } catch (error) {
        return {
            subject: secondFollowUp.subject,
            body: polishBody(secondFollowUp.body)
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
    const customerTerm = await getNicheTerminology(lead); // Now async

    const followUpTemplates = {
        AUTOMATION: {
            subject: `${businessName} — just following up`,
            body: `Hi,

Sent a note last week about automation. A client I worked with last month was manually following up with leads — now it runs itself and he's closing 40% more.

Reply if you want to see how.`
        },
        BAD_SEO: {
            subject: `${businessName} — Google still can't see you`,
            body: `Hi,

Sent a note about your SEO. Had a client invisible in ${loc} searches — fixed the technical gaps and he hit page one in three weeks.

Reply if you want the breakdown.`
        },
        WEBSITE_DOWN: {
            subject: `${businessName} — site still unreachable`,
            body: `Hi,

Your site's still down. Every hour costs you ${customerTerm} calling competitors instead.

Reply if you want help today.`
        },
        SEO_AND_SPEED: {
            subject: `${businessName} — still losing ${customerTerm} to speed and SEO`,
            body: `Hi,

Sent a note about your site speed and SEO. Client had the same combo — fixed both and his traffic doubled in a month.

Reply if you want details.`
        },
        INSECURE: {
            subject: `${businessName} — the warning is still scaring people off`,
            body: `Hi,

That security warning's still there. Client had the same issue — visitors dropped 60% until we fixed it.

Reply if you want it gone.`
        },
        INSECURE_ALL: {
            subject: `${businessName} — three things still costing you ${customerTerm}`,
            body: `Hi,

Sent a note about the security warning, speed, and SEO. Client had all three — fixed them and his leads tripled in six weeks.

Reply if you want the same.`
        },
        INSECURE_SEO: {
            subject: `${businessName} — still flagged and invisible`,
            body: `Hi,

Security warning and SEO are still broken. Client had both — Google wouldn't rank him until we fixed the warning first.

Reply if you want it fixed.`
        },
        INSECURE_SLOW: {
            subject: `${businessName} — warning and speed still killing traffic`,
            body: `Hi,

Security warning and slow load are still there. Client lost 70% of visitors with the same combo until we fixed it.

Reply if you're ready.`
        },
        SLOW_LOAD: {
            subject: `${businessName} — speed is still costing you`,
            body: `Hi,

Your site's still slow at ${load}. Client had a 6-second load — cut it to 2 and his bounce rate dropped 50%.

Reply if you want that.`
        },
        NO_WEBSITE: {
            subject: `${businessName} — ${customerTerm} still can't find you`,
            body: `Hi,

You're still invisible online. Client had no site — built one and he got 30 leads in the first month from ${loc} searches.

Reply if you're ready.`
        },
        MOBILE: {
            subject: `${businessName} — mobile is still broken`,
            body: `Hi,

Your mobile site's still broken. Client lost 60% of traffic on phones — fixed it and conversions jumped immediately.

Reply if you want it working.`
        }
    };

    const followUp = followUpTemplates[scenario] || followUpTemplates['AUTOMATION'];

    const prompt = `### TASK
You are Hamdan Ahmad. Rephrase this follow-up with a quick client success story.

### RULES
1. SUBJECT ALWAYS STARTS WITH THE BUSINESS NAME.
2. Keep the "Hi," greeting on its OWN LINE with a line break AFTER it.
3. Keep 50-60 words total — brief but with substance.
4. Include a mini story about a past client with a real result.
5. NO "AI" fluff words (leverage, empower, boost, etc.)
6. End with "Reply if you want [specific outcome]."

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
    generateSecondFollowUpBody,
    rankEmailsWithAI
};

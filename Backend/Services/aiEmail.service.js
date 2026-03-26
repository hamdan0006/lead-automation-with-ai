const { OpenAI } = require('openai');
const logger = require('../utils/logger');

const apiKey = process.env.Llama_KEY;

let openai;
if (apiKey) {
    openai = new OpenAI({
        apiKey: apiKey,
        baseURL: "https://openrouter.ai/api/v1"
    });
}

/**
 * Generates an initial cold outreach email using Llama 3.3 70B
 * @param {string} businessName 
 * @param {string} industry 
 * @param {string} city 
 * @param {boolean} isInsecure - Whether the site uses http instead of https
 * @returns {Promise<string>} The generated email text
 */
const generateOutreachBody = async (businessName, industry, city, isInsecure = false) => {
    if (!openai) {
        throw new Error('Llama API key missing. Cannot generate AI email.');
    }

    const insecureNote = isInsecure 
        ? `- Specifically mention that you noticed their website is currently flagged as "Not Secure" because it's using http instead of https.
- Explain that you build websites and specifically work on security, performance, and automation to decrease their effort and help the business grow.`
        : `- After mentioning their presence, add: "Most agencies in your space have a couple of small gaps that quietly cost them leads — and I think I've spotted a few for you specifically."
- Mention how you build automations that handle the repetitive stuff in the background, so growth doesn't always need their attention.`;

    const prompt = `Write a short cold outreach email from a web developer who also builds AI automations.

Rules:
- Maximum 75 words
- NO MARKETING BUZZWORDS. No emojis. No markdown.
- USE LINE BREAKS. Write exactly 3 very short paragraph blocks, separated by empty lines.
- Paragraph 1: Mention [Business name] has a strong presence in [City] [Industry].
- Paragraph 2: ${insecureNote}
- Paragraph 3: Mention you build automations and end with the question: "Worth a quick look?"
- Sign-off (ensure there is an empty line before this):
  Regards,
  BizBuilder
- Return only the raw email text with paragraph breaks, nothing else.

Business name: ${businessName}
Industry: ${industry}
City: ${city}`;

    try {
        const response = await openai.chat.completions.create({
            model: "meta-llama/llama-3.3-70b-instruct",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 200
        });

        // The model should return only the email body
        return response.choices[0].message.content.trim();
    } catch (error) {
        logger.error(`❌ Failed to generate AI outreach email: ${error.message}`);
        throw error;
    }
};

/**
 * Generates a simple follow-up email after 3 days
 * @param {string} businessName 
 * @param {string} industry
 * @param {boolean} isInsecure
 * @returns {Promise<string>} The generated follow-up email text
 */
const generateFollowUpBody = async (businessName, industry, isInsecure = false) => {
    if (!openai) {
        throw new Error('Llama API key missing. Cannot generate AI email.');
    }

    const insecureFollowUp = isInsecure
        ? `- Briefly re-mention the security issue (http vs https) and how you can help fix it while improving their site's performance and security overall.`
        : `- Briefly re-hint that those small gaps are still there and easy to fix.`;

    const prompt = `Write a very short follow-up to a previous email.

Rules:
- Maximum 35 words.
- No marketing buzzwords. No emojis. No markdown.
- USE LINE BREAKS. Write exactly 2 short paragraph blocks, separated by empty lines.
- Paragraph 1: Mention you're just following up on your last note regarding ${businessName}.
- Paragraph 2: ${insecureFollowUp} End with the question: "Worth a quick chat?"
- Sign-off (ensure there is an empty line before this):
  Regards,
  BizBuilder
- Return only the raw email text with paragraph breaks, nothing else.

Business name: ${businessName}
Industry: ${industry || 'business'}`;

    try {
        const response = await openai.chat.completions.create({
            model: "meta-llama/llama-3.3-70b-instruct",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 100
        });

        return response.choices[0].message.content.trim();
    } catch (error) {
        logger.error(`❌ Failed to generate AI follow up email: ${error.message}`);
        throw error;
    }
};

module.exports = {
    generateOutreachBody,
    generateFollowUpBody
};

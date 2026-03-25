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
 * @returns {Promise<string>} The generated email text
 */
const generateOutreachBody = async (businessName, industry, city) => {
    if (!openai) {
        throw new Error('Llama API key missing. Cannot generate AI email.');
    }

    const prompt = `Write a short cold outreach email from a web developer who also builds AI automations.

Rules:
- Maximum 75 words
- Natural, conversational human tone
- No marketing buzzwords or hype
- No emojis, no markdown (do not use **, _, or ##)
- USE LINE BREAKS. Break the email into 3 or 4 very short paragraph blocks (separated by empty lines) to make it highly readable.
- Start with the business name in the first sentence
- Make a subtle, specific observation about their website — something that feels like you actually visited it, not generic
- Hint that their site may not be converting or capturing leads as well as it could
- Naturally mention that you build websites and AI automations for businesses in their industry
- Keep the tone curious and helpful, never pushy or salesy
- Close the final paragraph with one simple, low-friction question
- End with a casual sign-off (on its own line), no name
- Return only the raw email text with paragraph spacing, nothing else

Business name: ${businessName}
Industry: ${industry}
City: ${city}
`;

    try {
        const response = await openai.chat.completions.create({
            model: "meta-llama/llama-3.3-70b-instruct",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 150
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
 * @returns {Promise<string>} The generated follow-up email text
 */
const generateFollowUpBody = async (businessName, industry) => {
    if (!openai) {
        throw new Error('Llama API key missing. Cannot generate AI email.');
    }

    const prompt = `Write a short follow-up to a previous cold outreach email.

Rules:
- Maximum 40 words
- Calm, natural tone — not pushy, not overly casual
- No emojis, no markdown (no bold or italics)
- USE LINE BREAKS. Write in 2 or 3 short paragraph blocks, separated by empty lines.
- Reference that you reached out before without being repetitive
- Briefly re-hint at their website or lead capture without re-pitching
- End with one easy yes/no question, like whether it's worth a quick chat
- Casual sign-off, no name
- Return only the raw email text with paragraph breaks, nothing else

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

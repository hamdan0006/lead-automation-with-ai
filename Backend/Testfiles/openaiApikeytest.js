require('dotenv').config({ path: '.env' }); // Adjusted to run from Backend root
const { OpenAI } = require('openai');

const apiKey = process.env.OPENAI_KEY;

if (!apiKey) {
  console.error('❌ OPENAI_KEY not found in .env');
  process.exit(1);
}

// Since the key format 'sk-or-v1-...' looks like OpenRouter, 
// we will configure it to use OpenRouter's base URL.
const openai = new OpenAI({
  apiKey: apiKey,
  baseURL: "https://openrouter.ai/api/v1"
});

async function testOpenAI() {
  console.log('🚀 Testing AI connection...');
  try {
    const response = await openai.chat.completions.create({
      model: "openai/gpt-3.5-turbo", // You can try "google/gemini-pro" or others on OpenRouter
      messages: [{ role: "user", content: "Say 'Hello, I am alive!' if you can hear me." }],
      max_tokens: 50
    });

    console.log('✅ Connection Successful!');
    console.log('🤖 Response:', response.choices[0].message.content);
  } catch (error) {
    console.error('❌ Connection Failed!');
    console.error('Error details:', error.message);
    
    // If it was meant to be direct OpenAI, try without baseURL if this failed
    if (error.status === 404 || error.message.includes('baseURL')) {
        console.log('🔄 Retrying without OpenRouter baseURL...');
        const directOpenai = new OpenAI({ apiKey });
        try {
            const res = await directOpenai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [{ role: "user", content: "Hello!" }]
            });
            console.log('✅ Connection Successful (Direct OpenAI)!');
            console.log('🤖 Response:', res.choices[0].message.content);
        } catch (innerError) {
            console.error('❌ Still failed:', innerError.message);
        }
    }
  }
}

testOpenAI();

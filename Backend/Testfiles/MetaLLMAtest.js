require('dotenv').config({ path: '.env' }); // Assuming run from Backend root
const { OpenAI } = require('openai');

const apiKey = process.env.Llama_KEY;

if (!apiKey) {
  console.error('❌ Llama_KEy not found in .env');
  process.exit(1);
}

// Since the key is sk-or-v1-..., it's an OpenRouter key
const openai = new OpenAI({
  apiKey: apiKey,
  baseURL: "https://openrouter.ai/api/v1"
});

async function testLlama() {
  console.log('🦙 Testing Meta Llama 3.3 70B connection via OpenRouter...');
  try {
    const response = await openai.chat.completions.create({
      model: "meta-llama/llama-3.3-70b-instruct", // Model string for Llama 3.3 70B on OpenRouter
      messages: [{ role: "user", content: "Say 'Llama is running!' if you can hear me." }],
      max_tokens: 50
    });

    console.log('✅ Llama Connection Successful!');
    console.log('🤖 Response:', response.choices[0].message.content);
  } catch (error) {
    console.error('❌ Llama Connection Failed!');
    console.log('Error details:', error.message);
  }
}

testLlama();

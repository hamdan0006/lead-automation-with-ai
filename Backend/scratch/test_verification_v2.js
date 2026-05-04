const { verifyEmail } = require('../Services/EmailVerification.service');

async function test() {
  const emails = ['parts@otp-hvac.com', 'j@q1es.com'];
  
  for (const email of emails) {
    console.log(`\n--- Testing: ${email} ---`);
    try {
      const result = await verifyEmail(email);
      console.log('Result:', JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('Error:', error);
    }
  }
}

test();

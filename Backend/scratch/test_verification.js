const { verifyEmail } = require('../Services/EmailVerification.service');

async function test() {
  const email = 'parts@otp-hvac.com';
  console.log(`Testing verification for: ${email}`);
  try {
    const result = await verifyEmail(email);
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

test();

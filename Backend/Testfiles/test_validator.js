const { validateEmail } = require('./utils/email.validator');
require('dotenv').config();

async function runTest() {
    const testEmail = 'hamdanahmad0006@gmail.com';
    console.log(`🧪 Testing Validation Pipeline for: ${testEmail}`);
    
    try {
        const isValid = await validateEmail(testEmail);
        console.log(`\n📢 Result for ${testEmail}:`);
        console.log(`✅ Status: ${isValid ? 'VALID & EXISTS' : 'INVALID or DOES NOT EXIST'}`);
    } catch (error) {
        console.error(`❌ Test failed: ${error.message}`);
    }
}

runTest();

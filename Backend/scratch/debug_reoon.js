const axios = require('axios');

async function checkKey() {
  const email = 'parts@otp-hvac.com';
  const key = 'VFoPcZ0etomISWmDzxK7wfHy7cG1JK8f'; // Key #1
  const url = `https://emailverifier.reoon.com/api/v1/verify?email=${email}&key=${key}&mode=power`;
  
  try {
    const response = await axios.get(url);
    console.log('Response:', response.data);
  } catch (error) {
    console.error('Error:', error.response ? error.response.status : error.message);
    if (error.response) console.error('Data:', error.response.data);
  }
}

checkKey();

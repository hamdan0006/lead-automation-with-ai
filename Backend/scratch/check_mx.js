const dns = require('dns').promises;

async function check() {
  try {
    const mx = await dns.resolveMx('otp-hvac.com');
    console.log(JSON.stringify(mx, null, 2));
  } catch (e) {
    console.error(e);
  }
}

check();

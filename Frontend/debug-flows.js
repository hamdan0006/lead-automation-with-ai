
const JSESSIONID = "ajax:1416467675844390651";
const li_at = "AQEDAWOKW9sCm4QWAAABm9r9niAAAAGb_woiIFYAtFw1dhfrLI9V57B-cdZkNLgggTE8oRun3AWZAMeyq_fNbroXWNbK57y7KH-l5YSbM4uZu1wYASJtgksXMcED1OVRNljNcW3fb33pq5wilfrUfqnj";

const cookies = `JSESSIONID=${JSESSIONID}; li_at=${li_at}`;

async function runTest(url, method = 'GET', body = null) {
    console.log(`Testing ${url} [${method}]...`);
    try {
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Cookie': cookies
            }
        };
        if (body) {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(url, options);

        console.log('Status:', response.status);
        const text = await response.text();
        console.log('Response:', text.substring(0, 100) + '...');
    } catch (error) {
        console.error('Error:', error);
    }
}

async function runAll() {
    // Test followers (POST)
    await runTest('http://192.168.1.23:5000/api/followers', 'POST', {
        "cookies": {
            "JSESSIONID": JSESSIONID,
            "li_at": li_at
        },
        "count": 10,
        "headers": {},
        "start": 0
    });

    // Test flows (GET)
    await runTest('http://192.168.1.23:5000/api/flows', 'GET');
}

runAll();

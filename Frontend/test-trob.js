
const JSESSIONID = "ajax:1416467675844390651";
const li_at = "AQEDAWOKW9sCm4QWAAABm9r9niAAAAGb_woiIFYAtFw1dhfrLI9V57B-cdZkNLgggTE8oRun3AWZAMeyq_fNbroXWNbK57y7KH-l5YSbM4uZu1wYASJtgksXMcED1OVRNljNcW3fb33pq5wilfrUfqnj";

const payload = {
    "cookies": {
        "JSESSIONID": JSESSIONID,
        "li_at": li_at
    },
    "count": 10,
    "headers": {},
    "start": 0
};

async function runTest(testUrl, label) {
    console.log(`\n--- Testing [${label}] ---`);
    console.log('URL:', testUrl);
    try {
        const response = await fetch(testUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        console.log('Status Code:', response.status);
        const text = await response.text();
        console.log('Response Body:', text);

        if (response.ok) {
            console.log(`✅ ${label} PASSED`);
        } else {
            console.log(`❌ ${label} FAILED`);
        }
    } catch (error) {
        console.error(`❌ ${label} ERROR:`, error.message);
    }
}

async function runAll() {
    await runTest('http://192.168.1.23:5000/api/followers', 'No Slash');
    await runTest('http://192.168.1.23:5000/api/followers/', 'With Slash');
}

runAll();

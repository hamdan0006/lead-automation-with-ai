// Test script for LinkedIn API endpoints
// Run this in browser console or as a standalone script

console.log('🧪 Starting Endpoint Tests...\n');

// Test Configuration
const PLATFORM_CONNECTIONS_URL = 'http://192.168.1.23:3000/api/platform-connections';
const FOLLOWERS_URL = 'http://192.168.1.23:5000/api/followers';
const TOKEN = localStorage.getItem('accessToken'); // Get from localStorage

// Test Data for Followers API
const followerTestPayload = {
    "cookies": {
        "JSESSIONID": "ajax:8229717240924779359",
        "li_at": "AQEDAUpWar4FQo65AAABm43-bL0AAAGcIsnsa00Ac4glL8uCEKzUK_sDb_J_UOeCpGzc3o2b9S9SDXAkyFGy7AS8iIf9rkaEKY0Iy_KdVLQ8JvA5IZko9dlkli7GKe5Mt6j9e8h-GmasBkbl7tpp_PrY"
    },
    "count": 10,
    "headers": {},
    "start": 0
};

// Test 1: Platform Connections Endpoint
async function testPlatformConnections() {
    console.log('\n📡 TEST 1: Platform Connections Endpoint');
    console.log('URL:', PLATFORM_CONNECTIONS_URL);
    console.log('Token:', TOKEN ? '✓ Present' : '✗ Missing');

    try {
        const response = await fetch(PLATFORM_CONNECTIONS_URL, {
            method: 'GET',
            headers: TOKEN ? { 'Authorization': `Bearer ${TOKEN}` } : {}
        });

        console.log('Status:', response.status, response.statusText);
        console.log('Headers:', Object.fromEntries(response.headers.entries()));

        if (response.ok) {
            const data = await response.json();
            console.log('✅ SUCCESS - Response Data:', data);

            // Analyze structure
            console.log('\n🔍 Analyzing Response Structure:');
            console.log('- Is Array?', Array.isArray(data));
            console.log('- Has .data?', !!data.data);
            console.log('- Has .connections?', !!data.connections);

            // Try to find LinkedIn connection
            const connectionsList = Array.isArray(data) ? data : (data.data || data.connections || []);
            console.log('- Connections List:', connectionsList);

            const linkedinConn = connectionsList.find(c =>
                c.platform?.toUpperCase() === 'LINKEDIN' && (c.isActive || c.connected)
            );
            console.log('- LinkedIn Connection Found?', !!linkedinConn);

            if (linkedinConn) {
                console.log('- LinkedIn Connection:', linkedinConn);
                console.log('- Has cookies?', !!linkedinConn.cookies);
                if (linkedinConn.cookies) {
                    console.log('- Cookies type:', typeof linkedinConn.cookies);
                    console.log('- Cookies:', linkedinConn.cookies);
                }
            }

            return { success: true, data };
        } else {
            const errorText = await response.text();
            console.error('❌ FAILED - Error:', errorText);
            return { success: false, error: errorText };
        }
    } catch (error) {
        console.error('❌ NETWORK ERROR:', error.message);
        console.error('Full Error:', error);
        return { success: false, error: error.message };
    }
}

// Test 2: Followers Endpoint
async function testFollowersEndpoint() {
    console.log('\n📡 TEST 2: Followers Endpoint');
    console.log('URL:', FOLLOWERS_URL);
    console.log('Payload:', JSON.stringify(followerTestPayload, null, 2));

    try {
        const response = await fetch(FOLLOWERS_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(followerTestPayload)
        });

        console.log('Status:', response.status, response.statusText);
        console.log('Headers:', Object.fromEntries(response.headers.entries()));

        if (response.ok) {
            const data = await response.json();
            console.log('✅ SUCCESS - Response Data:', data);

            // Analyze structure
            console.log('\n🔍 Analyzing Response Structure:');
            console.log('- Has .data?', !!data.data);
            console.log('- Has .followers?', !!data.followers);
            console.log('- Has .data.followers?', !!data.data?.followers);

            const followers = data.data?.followers || data.followers || data.data || [];
            console.log('- Followers Count:', Array.isArray(followers) ? followers.length : 'Not an array');
            if (Array.isArray(followers) && followers.length > 0) {
                console.log('- First Follower Sample:', followers[0]);
            }

            return { success: true, data };
        } else {
            const errorText = await response.text();
            console.error('❌ FAILED - Error:', errorText);
            return { success: false, error: errorText };
        }
    } catch (error) {
        console.error('❌ NETWORK ERROR:', error.message);
        console.error('Full Error:', error);
        return { success: false, error: error.message };
    }
}

// Test 3: Integration Test - Get cookies from platform-connections and use them
async function testIntegration() {
    console.log('\n📡 TEST 3: Integration Test (Get cookies → Fetch followers)');

    const connectionsResult = await testPlatformConnections();

    if (!connectionsResult.success) {
        console.error('❌ Cannot proceed - Platform connections failed');
        return;
    }

    // Extract cookies
    const data = connectionsResult.data;
    const connectionsList = Array.isArray(data) ? data : (data.data || data.connections || []);
    const linkedinConn = connectionsList.find(c =>
        c.platform?.toUpperCase() === 'LINKEDIN' && (c.isActive || c.connected)
    );

    if (!linkedinConn || !linkedinConn.cookies) {
        console.error('❌ Cannot proceed - No LinkedIn cookies found');
        return;
    }

    console.log('\n✅ Extracted cookies from platform-connections');

    // Parse cookies
    let cookieData = linkedinConn.cookies;
    if (typeof cookieData === 'string') {
        try {
            cookieData = JSON.parse(cookieData);
        } catch (e) {
            console.error('Failed to parse cookies:', e);
            return;
        }
    }

    let extractedCookies = { JSESSIONID: '', li_at: '' };

    if (Array.isArray(cookieData)) {
        const jsession = cookieData.find(c => c.name === 'JSESSIONID');
        const liAt = cookieData.find(c => c.name === 'li_at');
        extractedCookies.JSESSIONID = jsession?.value?.replace(/"/g, '').trim() || '';
        extractedCookies.li_at = liAt?.value?.replace(/"/g, '').trim() || '';
    } else if (typeof cookieData === 'object' && cookieData !== null) {
        extractedCookies.JSESSIONID = (cookieData.JSESSIONID || '').replace(/"/g, '').trim();
        extractedCookies.li_at = (cookieData.li_at || '').replace(/"/g, '').trim();
    }

    console.log('Extracted Cookies:', {
        JSESSIONID: extractedCookies.JSESSIONID ? '✓ Present' : '✗ Missing',
        li_at: extractedCookies.li_at ? '✓ Present' : '✗ Missing'
    });

    if (!extractedCookies.JSESSIONID || !extractedCookies.li_at) {
        console.error('❌ Cannot proceed - Cookies are incomplete');
        return;
    }

    // Now test followers with extracted cookies
    console.log('\n🔄 Testing followers endpoint with extracted cookies...');

    const integrationPayload = {
        cookies: extractedCookies,
        count: 10,
        headers: {},
        start: 0
    };

    try {
        const response = await fetch(FOLLOWERS_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(integrationPayload)
        });

        console.log('Status:', response.status, response.statusText);

        if (response.ok) {
            const data = await response.json();
            console.log('✅ INTEGRATION SUCCESS!');
            console.log('Response:', data);
            return { success: true, data };
        } else {
            const errorText = await response.text();
            console.error('❌ INTEGRATION FAILED:', errorText);
            return { success: false, error: errorText };
        }
    } catch (error) {
        console.error('❌ INTEGRATION ERROR:', error.message);
        return { success: false, error: error.message };
    }
}

// Run all tests
async function runAllTests() {
    console.log('═══════════════════════════════════════════════════════');
    console.log('🧪 LINKEDIN API ENDPOINT TESTS');
    console.log('═══════════════════════════════════════════════════════');

    await testPlatformConnections();
    console.log('\n' + '─'.repeat(60));

    await testFollowersEndpoint();
    console.log('\n' + '─'.repeat(60));

    await testIntegration();

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('✅ ALL TESTS COMPLETED');
    console.log('═══════════════════════════════════════════════════════\n');
}

// Auto-run if in browser console
if (typeof window !== 'undefined') {
    console.log('💡 Running tests automatically...\n');
    runAllTests();
} else {
    console.log('💡 To run tests, call: runAllTests()');
}

// Export for manual use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        testPlatformConnections,
        testFollowersEndpoint,
        testIntegration,
        runAllTests
    };
}

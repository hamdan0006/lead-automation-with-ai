const axios = require('axios');

async function testPageSpeed(url) {
    console.log(`🚀 Testing Google PageSpeed for: ${url}`);
    const apiEndpoint = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile`;
    
    try {
        const start = Date.now();
        const response = await axios.get(apiEndpoint);
        const duration = (Date.now() - start) / 1000;
        
        console.log(`✅ Success! Request took ${duration}s`);
        
        const audits = response.data.lighthouseResult.audits;
        const lcp = audits['largest-contentful-paint'].displayValue;
        const score = response.data.lighthouseResult.categories.performance.score * 100;
        
        console.log(`📊 Performance Score: ${score}/100`);
        console.log(`⏱️ Largest Contentful Paint: ${lcp}`);
        
    } catch (error) {
        console.error('❌ Google PageSpeed API Failed!');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Error Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Message:', error.message);
        }
    }
}

// Test with a common site
testPageSpeed('https://www.google.com');

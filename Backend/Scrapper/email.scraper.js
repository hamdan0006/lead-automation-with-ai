const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const axios = require('axios');

const logger = require('../utils/logger');

/**
 * Utility to pause execution
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fetch website speed using check-host.net API
 * Returns the average response time from multiple global nodes in seconds
 */
const getCheckHostSpeed = async (url) => {
  try {
    logger.info(`🛰️ Starting check-host.net speed test for: ${url}`);
    
    // Step 1: Initialize check
    const { data: initData } = await axios.get(
      `https://check-host.net/check-http?host=${encodeURIComponent(url)}&max_nodes=3`,
      { headers: { 'Accept': 'application/json' } }
    );

    if (!initData || !initData.request_id) {
        throw new Error('Failed to initialize check-host request');
    }

    // Step 2: Wait for nodes to respond (5s as per your recommendation)
    await sleep(5000);

    // Step 3: Fetch results
    const { data: results } = await axios.get(
      `https://check-host.net/check-result/${initData.request_id}`,
      { headers: { 'Accept': 'application/json' } }
    );

    let totalMs = 0;
    let nodeCount = 0;

    // Calculate average from all nodes that responded
    for (const [node, result] of Object.entries(results)) {
      if (result?.[0] && result[0][0] === 1) { // 1 means success
        const responseTimeMs = result[0][1] * 1000; // API returns seconds, convert to ms for precision
        totalMs += responseTimeMs;
        nodeCount++;
      }
    }

    if (nodeCount === 0) return null;

    const averageSeconds = parseFloat(((totalMs / nodeCount) / 1000).toFixed(2));
    return averageSeconds;

  } catch (error) {
    logger.warn(`⚠️ check-host.net API failed for ${url}: ${error.message}. Falling back to internal timing.`);
    return null;
  }
};

/**
 * Email Scraper - Scrolls through a website and extracts found emails
 * @param {string} url - The URL of the lead's website
 * @returns {Promise<string[]>} - A list of unique email addresses found
 */
const extractEmailsFromWebsite = async (url) => {
  let browser = null;
  try {
    logger.info(`🌐 Starting email extraction for: ${url}`);
    
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
    });

    const page = await browser.newPage();
    // Simulate user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Go to the website
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    if (response && !response.ok()) {
      const status = response.status();
      logger.warn(`⚠️ Website returned status ${status} for ${url}. Skipping to fallback.`);
      return { emails: [], seoTitle: `Unreachable (${status})`, seoDescription: 'The website returned a server error and could not be scraped.' };
    }

    // 📜 Scroll through the website to trigger lazy loading or dynamic content
    logger.info(`📜 Scrolling website: ${url}`);
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        let distance = 300;
        let timer = setInterval(() => {
          let scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= scrollHeight || totalHeight > 5000) { // Limit scroll to 5000px
            clearInterval(timer);
            resolve();
          }
        }, 150);
      });
    });

    // Wait a brief moment for content to load after scroll
    await sleep(2000);

    // Extraction: Find emails and SEO info in page content
    const pageData = await page.evaluate(() => {
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      
      // SEO Info
      const seoTitle = document.title;
      const seoDescription = document.querySelector('meta[name="description"]')?.getAttribute('content') || null;

      // Check for mobile responsiveness (viewport meta tag presence)
      const hasViewportMeta = document.querySelector('meta[name="viewport"]') !== null;

      // Get all text from body for email extraction
      const text = document.body.innerText;
      const foundEmails = text.match(emailRegex) || [];
      
      // Also look for mailto: links
      const mailtoLinks = Array.from(document.querySelectorAll('a[href^="mailto:"]'))
        .map(a => a.href.replace('mailto:', '').split('?')[0]);

      // ⏱️ Internal Performance fallback computation (Incognito visual load time)
      const timing = window.performance.timing;
      const localLoadTimeSeconds = ((timing.domContentLoadedEventEnd || Date.now()) - timing.navigationStart) / 1000;

      return {
        emails: [...foundEmails, ...mailtoLinks],
        seoTitle,
        seoDescription,
        isResponsive: hasViewportMeta,
        localLoadTime: parseFloat(localLoadTimeSeconds.toFixed(2))
      };
    });

    // ⚡ Fetch objective speed from check-host.net (or fallback to local timing)
    let finalLoadTime = await getCheckHostSpeed(url);
    if (!finalLoadTime) {
      finalLoadTime = pageData.localLoadTime;
      logger.info(`⏱️ Using internal load time: ${finalLoadTime}s (check-host API unavailable)`);
    } else {
      logger.info(`⚡ check-host.net Verified Load Time: ${finalLoadTime}s`);
    }

    // Log the emails found
    const uniqueEmails = [...new Set(pageData.emails.map(e => e.toLowerCase().trim()))];
    logger.info(`✅ Found ${uniqueEmails.length} unique emails on ${url}`);

    return {
      emails: uniqueEmails,
      seoTitle: pageData.seoTitle,
      seoDescription: pageData.seoDescription,
      loadTime: finalLoadTime,
      isResponsive: pageData.isResponsive
    };

  } catch (error) {
    logger.error(`❌ Error extracting emails from ${url}: ${error.message}`);
    const isTimeout = error.message.toLowerCase().includes('timeout');
    return { 
      emails: [], 
      seoTitle: isTimeout ? 'Unreachable (Timeout)' : 'Unreachable (Error)', 
      seoDescription: `Failed to load website: ${error.message}`,
      loadTime: null,
      isResponsive: null
    };
  } finally {
    if (browser) await browser.close();
  }
};

/**
 * Web Search Fallback (SerpStack API) - Uses a clean API instead of Puppeteer to bypass all captchas
 * @param {string} businessName - The name of the business (e.g., "Ocean International Realty")
 * @returns {Promise<string[]>} - A list of unique email addresses found in snippets
 */
const searchEmailsOnWeb = async (businessName) => {
  try {
    const apiKey = process.env.SERPSTACK_API_KEY;
    const apiUrl = process.env.SERPSTACK_API_URL || 'https://api.serpstack.com/search';

    if (!apiKey) {
      logger.error('❌ SerpStack API Key is missing in .env!');
      return [];
    }

    // Step 1: Formulate clean query
    const cleanName = businessName.replace(/[|;$%@"<>()+,]/g, " ").replace(/\s+/g, " ").trim();
    const searchQuery = `${cleanName} email address`; 

    logger.info(`🔍 Performing SerpStack API search for: "${searchQuery}"`);

    // Step 2: Hit SerpStack API
    const response = await axios.get(apiUrl, {
      params: {
        access_key: apiKey,
        query: searchQuery,
        num: 10 // Get top 10 results
      }
    });

    const data = response.data;

    if (!data || !data.organic_results) {
      logger.warn(`⚠️ SerpStack returned no organic results for: "${searchQuery}"`);
      return [];
    }

    // Step 3: Extract emails from all results (titles, snippets, and URLs)
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const allEmails = new Set();

    // Scan Organic Results
    data.organic_results.forEach(res => {
      const combinedText = `${res.title} ${res.snippet} ${res.url}`;
      const matches = combinedText.match(emailRegex);
      if (matches) matches.forEach(e => allEmails.add(e.toLowerCase()));
    });

    // Scan Knowledge Graph if present
    if (data.knowledge_graph) {
      const kgText = JSON.stringify(data.knowledge_graph);
      const matches = kgText.match(emailRegex);
      if (matches) matches.forEach(e => allEmails.add(e.toLowerCase()));
    }

    const uniqueEmails = Array.from(allEmails)
      .filter(e => !e.includes('sentry.io') && !e.includes('google.com') && !e.includes('bing.com'));

    // 🎯 Filtering logic: Find the "best match" email
    const nameKeywords = businessName.toLowerCase().split(' ').filter(word => word.length > 3);
    
    uniqueEmails.sort((a, b) => {
      const aMatches = nameKeywords.filter(kw => a.includes(kw)).length;
      const bMatches = nameKeywords.filter(kw => b.includes(kw)).length;
      if (bMatches !== aMatches) return bMatches - aMatches;
      const prefixes = ['info@', 'contact@', 'hello@'];
      const aPref = prefixes.some(p => a.startsWith(p));
      const bPref = prefixes.some(p => b.startsWith(p));
      if (aPref && !bPref) return -1;
      if (!aPref && bPref) return 1;
      return 0;
    });

    logger.info(`✅ SerpStack API sorted ${uniqueEmails.length} emails for "${businessName}". Best match: ${uniqueEmails[0] || 'none'}`);
    
    return {
      emails: uniqueEmails
    };

  } catch (error) {
    logger.error(`❌ SerpStack Fallback failed for "${businessName}": ${error.message}`);
    return { emails: [] };
  }
};

module.exports = {
  extractEmailsFromWebsite,
  searchEmailsOnWeb
};

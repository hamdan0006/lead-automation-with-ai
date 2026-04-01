const axios = require('axios');
const logger = require('../utils/logger');
const { getBrowser } = require('../utils/browser.helper');
const browserMonitor = require('../utils/browser.monitor');
const redis = require('../config/redis');

/**
 * Utility to pause execution
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Email Scraper - Scrolls through a website and extracts found emails
 * @param {string} url - The URL of the lead's website
 * @returns {Promise<string[]>} - A list of unique email addresses found
 */
const extractEmailsFromWebsite = async (url) => {
  let browser = null;
  let page = null;
  try {
    logger.info(`🌐 Processing lead (Pooled Tab): ${url}`);
    
    // 🟠 POOLING: Get the shared browser instead of launching a new one
    browser = await getBrowser();
    page = await browser.newPage();
    browserMonitor.trackPageOpen();
    
    // 🟢 Optimization: Block heavy resources (Images, CSS, Fonts)
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const type = req.resourceType();
      if (['image', 'stylesheet', 'font', 'media'].includes(type)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    // Simulate user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Go to the website
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 }); // 🕒 30s timeout

    if (response && !response.ok()) {
      const status = response.status();
      logger.warn(`⚠️ Website returned status ${status} for ${url}. Skipping to fallback.`);
      return { emails: [], seoTitle: `Unreachable (${status})`, seoDescription: 'The website returned a server error and could not be scraped.' };
    }

    // ⏱️ Capture load time IMMEDIATELY after page load — before any scroll/sleep distorts the timing
    const loadTime = await page.evaluate(() => {
      const timing = window.performance.timing;
      const navStart = timing.navigationStart;
      const loadEnd = timing.domContentLoadedEventEnd || timing.loadEventEnd || Date.now();
      return parseFloat(((loadEnd - navStart) / 1000).toFixed(2));
    });
    logger.info(`⏱️ Page load time for ${url}: ${loadTime}s`);

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

          if (totalHeight >= scrollHeight || totalHeight > 5000) {
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

      return {
        emails: [...foundEmails, ...mailtoLinks],
        seoTitle,
        seoDescription,
        isResponsive: hasViewportMeta
      };
    });

    // Log the emails found
    const uniqueEmails = [...new Set(pageData.emails.map(e => e.toLowerCase().trim()))];
    logger.info(`✅ Found ${uniqueEmails.length} unique emails on ${url}`);

    return {
      emails: uniqueEmails,
      seoTitle: pageData.seoTitle,
      seoDescription: pageData.seoDescription,
      loadTime,
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
    if (page) {
      await page.close(); // 🟠 Close ONLY the tab, keep the browser alive!
      browserMonitor.trackPageClose();
    }
  }
};

/**
 * Web Search Fallback (SerpStack API) - Uses a clean API instead of Puppeteer to bypass all captchas
 * @param {string} businessName - The name of the business (e.g., "Ocean International Realty")
 * @returns {Promise<string[]>} - A list of unique email addresses found in snippets
 */
// ============================================================
// SerpStack Rate-Limit Protection
// Concurrency=3 means multiple leads can call SerpStack at once.
// This semaphore allows only 1 SerpStack call at a time to
// prevent 429 errors, while still processing leads in parallel.
// ============================================================
let serpstackBusy = false;
const serpstackQueue = [];

const acquireSerpstackLock = () => new Promise((resolve) => {
  if (!serpstackBusy) {
    serpstackBusy = true;
    resolve();
  } else {
    serpstackQueue.push(resolve);
  }
});

const releaseSerpstackLock = () => {
  if (serpstackQueue.length > 0) {
    const next = serpstackQueue.shift();
    next(); // Hand lock to next waiter
  } else {
    serpstackBusy = false;
  }
};

// ============================================================
// API Key Rotation Logic (ATOMIC)
// Uses Redis for thread-safe counter across all workers
// ============================================================
const getNextSerpstackKey = async () => {
  const keys = [
    process.env.SERPSTACK_API_KEY1,
    process.env.SERPSTACK_API_KEY2,
    process.env.SERPSTACK_API_KEY3,
    process.env.SERPSTACK_API_KEY4,
    process.env.SERPSTACK_API_KEY5,
    process.env.SERPSTACK_API_KEY6,
    process.env.SERPSTACK_API_KEY7,
    process.env.SERPSTACK_API_KEY8,
    process.env.SERPSTACK_API_KEY9,
    process.env.SERPSTACK_API_KEY10
  ].filter(k => k && k.trim() !== ''); // Clean out any missing or empty keys

  if (keys.length === 0) return null;

  // 🟢 ATOMIC FIX: Use Redis for atomic counter (thread-safe across workers)
  const index = await redis.incr('serpstack:key:index');
  const keyToUse = keys[(index - 1) % keys.length].trim();
  
  return { 
    key: keyToUse, 
    index: ((index - 1) % keys.length) + 1 
  };
};

const searchEmailsOnWeb = async (businessName) => {
  const apiUrl = process.env.SERPSTACK_API_URL || 'https://api.serpstack.com/search';

  // Serialize searches to prevent hitting rate limits
  await acquireSerpstackLock();

  try {
    // Random jitter (1-2s) 
    const jitter = Math.floor(Math.random() * 1000) + 1000;
    await sleep(jitter);

    const cleanName = businessName.replace(/[|;$%@"<>()+,]/g, ' ').replace(/\s+/g, ' ').trim();
    const searchQuery = `${cleanName} email address`;

    let lastError;
    
    // Attempt up to 10 times (to cycle through all 10 keys)
    for (let attempt = 1; attempt <= 10; attempt++) {
      const keyData = await getNextSerpstackKey(); // 🟢 FIX: Added await
      
      if (!keyData || !keyData.key) {
        logger.error('❌ SerpStack API Keys are all missing in .env!');
        return { emails: [] };
      }
      
      const { key: apiKey, index: keyNumber } = keyData;

      logger.info(`🔍 SerpStack search for: "${searchQuery}" (Using Key #${keyNumber} | Attempt ${attempt})`);

      try {
        const response = await axios.get(apiUrl, {
          params: {
            access_key: apiKey,
            query: searchQuery,
            num: 15 // Pulling slightly more results for better accuracy
          }
        });

        const data = response.data;

        // SerpStack errors (like rate limit inside the payload rather than a 429 status code)
        if (data && data.error) {
          throw new Error(`SerpStack API returned error: ${JSON.stringify(data.error)}`);
        }

        if (!data || !data.organic_results) {
          logger.warn(`⚠️ SerpStack returned no organic results for: "${searchQuery}"`);
          return { emails: [] };
        }

        // Extract emails from results, snippets, and knowledge graph
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const allEmails = new Set();

        data.organic_results.forEach(res => {
          const combinedText = `${res.title} ${res.snippet} ${res.url}`;
          const matches = combinedText.match(emailRegex);
          if (matches) matches.forEach(e => allEmails.add(e.toLowerCase()));
        });

        if (data.knowledge_graph) {
          const matches = JSON.stringify(data.knowledge_graph).match(emailRegex);
          if (matches) matches.forEach(e => allEmails.add(e.toLowerCase()));
        }

        const uniqueEmails = Array.from(allEmails)
          .filter(e => !e.includes('sentry.io') && !e.includes('google.com') && !e.includes('bing.com'));

        // Sort: best match first
        const nameKeywords = businessName.toLowerCase().split(' ').filter(w => w.length > 3);
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

        logger.info(`✅ SerpStack sorted ${uniqueEmails.length} emails for "${businessName}". Best: ${uniqueEmails[0] || 'none'}`);
        return { emails: uniqueEmails };

      } catch (err) {
        lastError = err;
        
        // If it's a rate limit or a generic error, we just loop again and it will naturally use the NEXT API Key!
        const isRateLimit = err.response?.status === 429 || (err.message && err.message.includes('rate'));
        
        logger.warn(`⚠️ SerpStack Failed using Key #${keyNumber} (${isRateLimit ? 'Rate Limit/Error' : err.message}). Rotating to next key...`);
        
        // Small delay before slamming the API with the next key
        await sleep(2000);
      }
    }

    throw lastError;

  } catch (error) {
    logger.error(`❌ SerpStack Fallback permanently failed for "${businessName}": ${error.message}`);
    return { emails: [] };
  } finally {
    releaseSerpstackLock();
  }
};

module.exports = {
  extractEmailsFromWebsite,
  searchEmailsOnWeb
};

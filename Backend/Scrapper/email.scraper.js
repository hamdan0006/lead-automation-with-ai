const puppeteer = require('puppeteer');
const logger = require('../utils/logger');

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
  try {
    logger.info(`🌐 Starting email extraction for: ${url}`);
    
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    // Simulate user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Go to the website
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

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

    // Extraction: Find emails in page content
    const emails = await page.evaluate(() => {
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      
      // Get all text from body
      const text = document.body.innerText;
      const foundEmails = text.match(emailRegex) || [];
      
      // Also look for mailto: links
      const mailtoLinks = Array.from(document.querySelectorAll('a[href^="mailto:"]'))
        .map(a => a.href.replace('mailto:', '').split('?')[0]);

      return [...foundEmails, ...mailtoLinks];
    });

    // Log the emails found
    const uniqueEmails = [...new Set(emails)].map(e => e.toLowerCase());
    logger.info(`✅ Found ${uniqueEmails.length} unique emails on ${url}: ${uniqueEmails.join(', ')}`);

    return uniqueEmails;

  } catch (error) {
    logger.error(`❌ Error extracting emails from ${url}: ${error.message}`);
    return [];
  } finally {
    if (browser) await browser.close();
  }
};

module.exports = {
  extractEmailsFromWebsite
};

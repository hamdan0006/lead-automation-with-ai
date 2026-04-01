const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const logger = require('./logger');
const browserMonitor = require('./browser.monitor');

let sharedBrowser = null;
let browserLaunchTime = null;
const MAX_BROWSER_AGE = 4 * 60 * 60 * 1000; // 4 hours in milliseconds

/**
 * 🛰️ GLOBAL BROWSER POOL WITH AUTO-RECYCLING
 * Reuses a single browser process across Maps, Email, and other scrapers.
 * Automatically recycles the browser every 4 hours to prevent memory leaks.
 * This saves ~300MB-500MB of RAM per worker and speeds up launch times.
 */
const getBrowser = async () => {
    const now = Date.now();
    
    // 1. Check if browser exists and is still connected
    if (sharedBrowser && sharedBrowser.isConnected()) {
        const browserAge = now - browserLaunchTime;
        
        // 2. Recycle browser if it's older than MAX_BROWSER_AGE
        if (browserAge > MAX_BROWSER_AGE) {
            const ageInHours = (browserAge / (1000 * 60 * 60)).toFixed(1);
            logger.info(`🔄 Browser reached max age (${ageInHours}h), recycling to prevent memory leaks...`);
            
            // Log stats before recycling
            browserMonitor.logStats();
            browserMonitor.trackRecycle();
            
            try {
                await sharedBrowser.close();
            } catch (err) {
                logger.warn(`⚠️ Error closing old browser: ${err.message}`);
            }
            
            sharedBrowser = null;
            browserLaunchTime = null;
        } else {
            // Browser is still fresh, reuse it
            return sharedBrowser;
        }
    }

    // 3. Launch a fresh browser instance with memory-optimized flags
    logger.info('🚀 Launching fresh global browser process...');
    browserLaunchTime = now;
    
    sharedBrowser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage', // 🟢 RAM Saver: Prevents /dev/shm issues
            '--disable-gpu',           // 🟢 RAM Saver: No graphics needed
            '--no-zygote',             // 🟢 RAM Saver: Less process overhead
            '--single-process',        // 🟢 RAM Saver: Runs in one process
            '--disable-blink-features=AutomationControlled',
            '--window-size=1280,800'
        ]
    });

    sharedBrowser.on('disconnected', () => {
        logger.warn('🔘 Global browser process disconnected.');
        sharedBrowser = null;
        browserLaunchTime = null;
    });

    logger.info(`✅ Browser launched successfully. Will recycle in ${MAX_BROWSER_AGE / (1000 * 60 * 60)} hours.`);
    return sharedBrowser;
};

/**
 * Manually close the browser (useful for graceful shutdown)
 */
const closeBrowser = async () => {
    if (sharedBrowser && sharedBrowser.isConnected()) {
        logger.info('🔒 Closing shared browser...');
        browserMonitor.logStats();
        await sharedBrowser.close();
        sharedBrowser = null;
        browserLaunchTime = null;
    }
};

/**
 * Get browser health statistics
 */
const getBrowserStats = () => {
    return {
        ...browserMonitor.getStats(),
        isConnected: sharedBrowser?.isConnected() || false,
        age: browserLaunchTime ? Date.now() - browserLaunchTime : 0,
        maxAge: MAX_BROWSER_AGE
    };
};

module.exports = { getBrowser, closeBrowser, getBrowserStats };

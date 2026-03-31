const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const logger = require('./logger');

let sharedBrowser = null;

/**
 * 🛰️ GLOBAL BROWSER POOL
 * Reuses a single browser process across Maps, Email, and other scrapers.
 * This saves ~300MB-500MB of RAM per worker and speeds up launch times.
 */
const getBrowser = async () => {
    // 1. Return existing browser if it's still alive
    if (sharedBrowser && sharedBrowser.isConnected()) {
        return sharedBrowser;
    }

    // 2. Otherwise, launch a fresh instance with memory-optimized flags
    logger.info('🚀 Launching fresh global browser process...');
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
    });

    return sharedBrowser;
};

module.exports = { getBrowser };

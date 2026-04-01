const logger = require('./logger');

/**
 * Browser Health Monitor
 * Tracks browser memory usage and provides diagnostics
 */
class BrowserMonitor {
    constructor() {
        this.stats = {
            pagesOpened: 0,
            pagesClosed: 0,
            recycleCount: 0,
            lastRecycleTime: null
        };
    }

    trackPageOpen() {
        this.stats.pagesOpened++;
    }

    trackPageClose() {
        this.stats.pagesClosed++;
    }

    trackRecycle() {
        this.stats.recycleCount++;
        this.stats.lastRecycleTime = new Date();
    }

    getStats() {
        return {
            ...this.stats,
            activePagesEstimate: this.stats.pagesOpened - this.stats.pagesClosed
        };
    }

    logStats() {
        const stats = this.getStats();
        logger.info(`📊 Browser Stats: Opened=${stats.pagesOpened}, Closed=${stats.pagesClosed}, Active≈${stats.activePagesEstimate}, Recycles=${stats.recycleCount}`);
    }

    // Check for potential memory leaks
    checkHealth() {
        const stats = this.getStats();
        
        if (stats.activePagesEstimate > 10) {
            logger.warn(`⚠️ Potential memory leak detected: ${stats.activePagesEstimate} pages may not be closed properly`);
            return false;
        }
        
        return true;
    }
}

const monitor = new BrowserMonitor();

module.exports = monitor;

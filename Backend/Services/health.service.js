const { prisma } = require('../config/db');
const redis = require('../config/redis');
const { getBrowserStats } = require('../utils/browser.helper');

/**
 * Business logic for health checks
 */
class HealthService {
  async checkStatus() {
    const checks = {
      database: false,
      redis: false,
      browser: null
    };

    // Check database connection
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.database = true;
    } catch (error) {
      checks.database = false;
    }

    // Check Redis connection
    checks.redis = redis.status === 'ready';

    // Check browser status
    try {
      checks.browser = getBrowserStats();
    } catch (error) {
      checks.browser = { error: error.message };
    }

    const allHealthy = checks.database && checks.redis;

    return {
      status: allHealthy ? 'healthy' : 'degraded',
      message: allHealthy ? 'BizBuilder API is running smoothly!' : 'Some services are unavailable',
      timestamp: new Date().toISOString(),
      checks
    };
  }
}

module.exports = new HealthService();

const Redis = require('ioredis');
const logger = require('../utils/logger');
require('dotenv').config();

const redisOptions = {
  maxRetriesPerRequest: null, // REQUIRED by BullMQ
  enableReadyCheck: false,
  
  // 🟢 Exponential Backoff Reconnection Strategy
  retryStrategy(times) {
    const delay = Math.min(times * 100, 3000); // 100ms, 200ms... up to 3 seconds
    if (times % 5 === 0) {
      logger.warn(`🔄 Redis Connection Issue: Attempt #${times}. Retrying in ${delay}ms...`);
    }
    return delay;
  },

  // Reconnect on specific fatal errors (like "READONLY" errors in cloud environments)
  reconnectOnError(err) {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      return true;
    }
  },
};

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', redisOptions);

redis.on('connect', () => {
  logger.info('🔴 Successfully connected to Redis');
});

redis.on('reconnecting', (delay) => {
  logger.warn(`🟡 Lost connection to Redis. Retrying in ${delay}ms...`);
});

redis.on('close', () => {
  logger.warn('🔘 Redis connection closed.');
});

redis.on('error', (err) => {
  logger.error(`❌ Redis Error: ${err.message}`);
});

module.exports = redis;

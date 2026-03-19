const Redis = require('ioredis');
const logger = require('../utils/logger');
require('dotenv').config();

const redisOptions = {
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false,
};

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', redisOptions);

redis.on('connect', () => {
  logger.info('🔴 Successfully connected to Redis Cache');
});

redis.on('error', (err) => {
  logger.error(`❌ Redis Runtime Error: ${err.message}`);
});

module.exports = redis;

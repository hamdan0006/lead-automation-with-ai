const Redis = require('ioredis');
const logger = require('../utils/logger');
require('dotenv').config();

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

redis.on('connect', () => {
  logger.info('🔴 Successfully connected to Redis Cache');
});

redis.on('error', (err) => {
  logger.error(`❌ Redis Runtime Error: ${err.message}`);
});

module.exports = redis;

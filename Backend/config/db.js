const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const logger = require('../utils/logger');

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' },
  ],
});

// Optional: log slow queries or all queries if it's helpful
prisma.$on('error', (e) => logger.error(`DB Error: ${e.message}`));
prisma.$on('warn',  (e) => logger.warn(`DB Warn: ${e.message}`));

const connectDB = async () => {
  try {
    // Basic query to force connection immediately
    await prisma.$queryRaw`SELECT 1`;
    logger.info('📦 Successfully connected to PostgreSQL Database via Prisma');
  } catch (error) {
    logger.error(`❌ Failed to connect to Database: ${error.message}`);
    process.exit(1);
  }
};

module.exports = { prisma, connectDB };

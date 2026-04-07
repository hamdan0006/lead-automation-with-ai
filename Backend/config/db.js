const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const logger = require('../utils/logger');

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ 
  connectionString,
  max: 10,                   // Reduced from 50 - each worker gets fewer connections
  min: 2,                    // Keep minimum 2 connections alive
  idleTimeoutMillis: 30000,  // Close idle connections after 30 seconds
  connectionTimeoutMillis: 10000, // Wait 10 seconds before throwing error
  allowExitOnIdle: false,    // Don't exit when all connections are idle
});
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

// Graceful shutdown - close all connections
const disconnectDB = async () => {
  try {
    await prisma.$disconnect();
    await pool.end();
    logger.info('🔌 Database connections closed gracefully');
  } catch (error) {
    logger.error(`❌ Error disconnecting from database: ${error.message}`);
  }
};

// Handle process termination
process.on('SIGINT', async () => {
  await disconnectDB();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await disconnectDB();
  process.exit(0);
});

module.exports = { prisma, connectDB, disconnectDB };

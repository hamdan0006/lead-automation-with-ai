const { PrismaClient } = require('@prisma/client');
const Redis = require('ioredis');

const prisma = new PrismaClient();
const redis = new Redis('redis://localhost:6379');

async function healthCheck() {
  console.log('🏥 Backend Health Check\n');
  
  try {
    // Check Database
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database: Connected');
  } catch (err) {
    console.log('❌ Database: FAILED -', err.message);
  }
  
  try {
    // Check Redis
    await redis.ping();
    console.log('✅ Redis: Connected');
  } catch (err) {
    console.log('❌ Redis: FAILED -', err.message);
  }
  
  try {
    // Check Queue Status
    const { Queue } = require('bullmq');
    const mapsQueue = new Queue('maps-scraping', { connection: redis });
    const emailQueue = new Queue('email-extraction', { connection: redis });
    
    const mapsCounts = await mapsQueue.getJobCounts();
    const emailCounts = await emailQueue.getJobCounts();
    
    console.log('\n📊 Queue Status:');
    console.log('Maps Queue:', mapsCounts);
    console.log('Email Queue:', emailCounts);
    
  } catch (err) {
    console.log('❌ Queues: FAILED -', err.message);
  }
  
  await prisma.$disconnect();
  await redis.quit();
  
  console.log('\n💡 If backend is down, restart it with: npm start');
}

healthCheck();

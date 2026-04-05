const { Queue } = require('bullmq');
const Redis = require('ioredis');
const redis = new Redis('redis://localhost:6379');

const emailQueue = new Queue('email-extraction', { connection: redis });

async function forceClean() {
  console.log('🧹 Force cleaning email queue...');
  
  // Clean all stuck active jobs (force)
  await emailQueue.clean(0, 1000, 'active');
  console.log('✅ Cleaned active jobs');
  
  // Clean old completed jobs
  await emailQueue.clean(0, 1000, 'completed');
  console.log('✅ Cleaned completed jobs');
  
  // Clean failed jobs
  await emailQueue.clean(0, 1000, 'failed');
  console.log('✅ Cleaned failed jobs');
  
  console.log('\n--- Queue Status After Cleanup ---');
  const counts = await emailQueue.getJobCounts();
  console.log(counts);
  
  await redis.quit();
}

forceClean();

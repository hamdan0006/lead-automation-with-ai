const { Queue } = require('bullmq');
const Redis = require('ioredis');
const redis = new Redis('redis://localhost:6379');

const emailQueue = new Queue('email-extraction', { connection: redis });

async function cleanStuck() {
  console.log('🧹 Cleaning stuck active jobs...');
  
  const active = await emailQueue.getActive();
  console.log(`Found ${active.length} active jobs`);
  
  for (const job of active) {
    console.log(`Removing stuck job ${job.id} (Lead #${job.data.leadId})`);
    await job.remove();
  }
  
  console.log('✅ Cleanup complete!');
  await redis.quit();
}

cleanStuck();

const { Queue } = require('bullmq');
const Redis = require('ioredis');
const redis = new Redis('redis://localhost:6379');

const mailQueue = new Queue('send-email', { connection: redis });

async function purge() {
  console.log('🧹 Purging send-email queue...');
  
  await mailQueue.drain(); // Clear waiting
  console.log('✅ Waiting jobs drained.');

  const failed = await mailQueue.getFailed();
  for (const job of failed) {
      await job.remove();
  }
  console.log(`✅ Removed ${failed.length} failed jobs.`);

  const delayed = await mailQueue.getDelayed();
  for (const job of delayed) {
      await job.remove();
  }
  console.log(`✅ Removed ${delayed.length} delayed jobs.`);

  const completed = await mailQueue.getCompleted();
  for (const job of completed) {
      await job.remove();
  }
  console.log(`✅ Removed ${completed.length} completed jobs.`);

  await redis.quit();
  console.log('🚀 Queue is now empty and fresh!');
}

purge().catch(console.error);

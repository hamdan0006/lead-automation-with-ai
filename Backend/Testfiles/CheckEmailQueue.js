const { Queue } = require('bullmq');
const Redis = require('ioredis');
const redis = new Redis('redis://localhost:6379');

const emailQueue = new Queue('email-extraction', { connection: redis });

async function check() {
  const waiting = await emailQueue.getWaiting();
  const active = await emailQueue.getActive();
  const failed = await emailQueue.getFailed();
  const delayed = await emailQueue.getDelayed();

  console.log('--- Email Queue Summary ---');
  console.log('Waiting:', waiting.length);
  console.log('Active:', active.length);
  console.log('Failed:', failed.length);
  console.log('Delayed:', delayed.length);

  console.log('\n--- Active Jobs ---');
  for (const job of active) {
    console.log(`Job ${job.id}: Lead #${job.data.leadId} - ${job.data.name}`);
  }

  console.log('\n--- Waiting Jobs ---');
  for (const job of waiting) {
    console.log(`Job ${job.id}: Lead #${job.data.leadId} - ${job.data.name}`);
  }

  console.log('\n--- Failed Jobs ---');
  for (const job of failed) {
    console.log(`Job ${job.id}: Lead #${job.data.leadId} - ${job.data.name} - ${job.failedReason}`);
  }

  await redis.quit();
}

check();

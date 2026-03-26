const { Queue } = require('bullmq');
const Redis = require('ioredis');
const redis = new Redis('redis://localhost:6379');

const mailQueue = new Queue('send-email', { connection: redis });

async function checkFailed() {
  const failed = await mailQueue.getFailed();
  console.log('--- Failed Details ---');
  console.log(JSON.stringify(failed.map(j => ({ id: j.id, reason: j.failedReason })), null, 2));

  await redis.quit();
}

checkFailed();

const { Queue } = require('bullmq');
const Redis = require('ioredis');
const redis = new Redis('redis://localhost:6379');

const mailQueue = new Queue('send-email', { connection: redis });

async function check() {
  const waiting = await mailQueue.getWaiting();
  const active = await mailQueue.getActive();
  const failed = await mailQueue.getFailed();
  const delayed = await mailQueue.getDelayed();

  console.log('--- Summary ---');
  console.log('Waiting:', waiting.length);
  console.log('Active:', active.length);
  console.log('Failed:', failed.length);
  console.log('Delayed:', delayed.length);

  console.log('--- Active Details ---');
  console.log(JSON.stringify(active.map(j => ({ id: j.id, progress: j.progress, state: j.processedOn })), null, 2));

  await redis.quit();
}

check();

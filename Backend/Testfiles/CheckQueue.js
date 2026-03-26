const { Queue } = require('bullmq');
const Redis = require('ioredis');
const redis = new Redis('redis://localhost:6379');

const mailQueue = new Queue('send-email', { connection: redis });

async function checkQueue() {
  const delayed = await mailQueue.getDelayed();
  console.log('--- Delayed Jobs ---');
  console.log(JSON.stringify(delayed.map(j => ({ id: j.id, data: j.data, delay: j.opts.delay })), null, 2));

  const active = await mailQueue.getActive();
  console.log('--- Active Jobs ---');
  console.log(JSON.stringify(active.map(j => ({ id: j.id, data: j.data })), null, 2));

  const waiting = await mailQueue.getWaiting();
  console.log('--- Waiting Jobs ---');
  console.log(JSON.stringify(waiting.map(j => ({ id: j.id, data: j.data })), null, 2));

  await redis.quit();
}

checkQueue();

const { Queue } = require('bullmq');
const Redis = require('ioredis');
const redis = new Redis('redis://localhost:6379');

const emailQueue = new Queue('email-extraction', { connection: redis });

async function nukeQueue() {
  console.log('💣 OBLITERATING email queue...');
  
  try {
    // Nuclear option - obliterate the entire queue
    await emailQueue.obliterate({ force: true });
    console.log('✅ Queue obliterated!');
    
    console.log('\n--- Queue Status ---');
    const counts = await emailQueue.getJobCounts();
    console.log(counts);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await redis.quit();
  }
}

nukeQueue();

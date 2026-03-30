const { Queue } = require('bullmq');
const Redis = require('ioredis');
const redis = new Redis('redis://localhost:6379');

const mailQueue = new Queue('send-email', { connection: redis });
const emailQueue = new Queue('email-extraction', { connection: redis });
const mapsQueue = new Queue('maps-scraper', { connection: redis });

const queues = [
    { name: 'send-email', q: mailQueue },
    { name: 'email-extraction', q: emailQueue },
    { name: 'maps-scraper', q: mapsQueue }
];

async function purgeAll() {
    for (const { name, q } of queues) {
        console.log(`🧹 Purging queue: ${name}...`);
        
        await q.drain(); // Clear all waiting
        
        // Remove failed, delayed, and completed jobs
        const statuses = ['failed', 'delayed', 'completed'];
        for (const status of statuses) {
            const count = await q.clean(0, 1000, status);
            console.log(`   ✅ Cleaned ${count} ${status} jobs.`);
        }
    }

    console.log('🚀 All queues are now empty and fresh!');
    await redis.quit();
}

purgeAll().catch(console.error);

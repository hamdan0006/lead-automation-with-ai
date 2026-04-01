require('dotenv').config();
const { Queue } = require('bullmq');
const redis = require('./config/redis');
const logger = require('./utils/logger');

/**
 * Clear All Background Jobs Utility
 * This script removes all pending, active, delayed, and failed jobs from all queues
 */

const queueNames = [
  'email-extraction',
  'send-email',
  'maps-scraper'
];

const clearAllJobs = async () => {
  logger.info('🧹 Starting job cleanup process...');
  
  try {
    for (const queueName of queueNames) {
      const queue = new Queue(queueName, { connection: redis });
      
      logger.info(`\n📦 Clearing queue: ${queueName}`);
      
      // Get counts before clearing
      const counts = await queue.getJobCounts('wait', 'active', 'completed', 'failed', 'delayed', 'paused');
      logger.info(`   Current jobs: Wait=${counts.wait}, Active=${counts.active}, Delayed=${counts.delayed}, Failed=${counts.failed}, Completed=${counts.completed}`);
      
      // Clear all job states
      await queue.drain(); // Remove all waiting jobs
      await queue.clean(0, 1000, 'completed'); // Remove completed jobs
      await queue.clean(0, 1000, 'failed'); // Remove failed jobs
      await queue.clean(0, 1000, 'active'); // Remove active jobs
      await queue.clean(0, 1000, 'delayed'); // Remove delayed jobs
      
      // Obliterate (nuclear option - removes everything including queue metadata)
      await queue.obliterate({ force: true });
      
      logger.info(`   ✅ Queue "${queueName}" cleared successfully`);
      
      await queue.close();
    }
    
    // Clear Redis keys related to daily email count
    const today = new Date().toISOString().split('T')[0];
    const dailyKey = `mail_sent_daily:${today}`;
    await redis.del(dailyKey);
    logger.info(`\n🗑️  Cleared daily email counter: ${dailyKey}`);
    
    // Clear batch completion locks
    const lockKeys = await redis.keys('batch-*-complete:*');
    if (lockKeys.length > 0) {
      await redis.del(...lockKeys);
      logger.info(`🔓 Cleared ${lockKeys.length} batch completion locks`);
    }
    
    // Clear SerpStack key rotation counter
    await redis.del('serpstack:key:index');
    logger.info(`🔄 Reset SerpStack API key rotation counter`);
    
    logger.info('\n✅ All jobs and counters cleared successfully!');
    logger.info('💡 You can now restart your workers with a clean slate.\n');
    
    process.exit(0);
    
  } catch (error) {
    logger.error(`❌ Error clearing jobs: ${error.message}`);
    process.exit(1);
  }
};

// Run the cleanup
clearAllJobs();

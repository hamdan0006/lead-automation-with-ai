const { PrismaClient } = require('@prisma/client');
const { Queue } = require('bullmq');
const Redis = require('ioredis');

const prisma = new PrismaClient();
const redis = new Redis('redis://localhost:6379');
const emailQueue = new Queue('email-extraction', { connection: redis });

async function requeueNewLead() {
  try {
    // Find the NEW lead
    const newLead = await prisma.lead.findFirst({
      where: { status: 'NEW' },
      orderBy: { id: 'desc' }
    });

    if (!newLead) {
      console.log('❌ No NEW leads found');
      await prisma.$disconnect();
      await redis.quit();
      return;
    }

    console.log(`Found NEW lead: #${newLead.id} - ${newLead.name}`);
    console.log(`Website: ${newLead.websiteUrl || 'No website'}`);

    // Add to queue
    const job = await emailQueue.add(
      `lead-${newLead.id}`,
      {
        leadId: newLead.id,
        websiteUrl: newLead.websiteUrl,
        name: newLead.name
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000
        },
        removeOnComplete: true,
        removeOnFail: false
      }
    );

    console.log(`✅ Added lead #${newLead.id} to queue (Job ID: ${job.id})`);
    console.log('Worker should pick it up now...');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
    await redis.quit();
  }
}

requeueNewLead();

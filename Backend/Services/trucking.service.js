const { prisma } = require('../config/db');
const logger = require('../utils/logger');
const { addFmcsaScrapingJob } = require('./fmcsaQueue.service');

/**
 * Create a TruckingJob record and enqueue it for FMCSA scraping.
 */
const startFmcsaScraping = async (fromDot, toDot) => {
  const job = await prisma.truckingJob.create({
    data: { fromDot, toDot, status: 'PENDING', results: 0 },
  });

  logger.info(`📝 TruckingJob #${job.id} created: DOT ${fromDot}–${toDot}`);

  await addFmcsaScrapingJob(fromDot, toDot, job.id);

  return job;
};

/**
 * Paginated list of TruckingJobs (newest first).
 */
const getTruckingJobs = async (page = 1, limit = 10) => {
  const skip = (page - 1) * limit;
  const [jobs, total] = await Promise.all([
    prisma.truckingJob.findMany({ orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.truckingJob.count(),
  ]);
  return { jobs, total };
};

/**
 * Paginated leads for a specific TruckingJob (or all leads if no jobId).
 */
const getTruckingLeads = async (jobId, page = 1, limit = 50) => {
  const skip = (page - 1) * limit;
  const where = jobId ? { truckingJobId: parseInt(jobId) } : {};
  const [leads, total] = await Promise.all([
    prisma.truckingLead.findMany({ where, orderBy: { usdotNumber: 'asc' }, skip, take: limit }),
    prisma.truckingLead.count({ where }),
  ]);
  return { leads, total };
};

/**
 * Delete a TruckingJob and all its associated leads.
 */
const deleteTruckingJob = async (jobId) => {
  await prisma.truckingLead.deleteMany({ where: { truckingJobId: parseInt(jobId) } });
  await prisma.truckingJob.delete({ where: { id: parseInt(jobId) } });
};
/**
 * Toggle contacted status for a single TruckingLead.
 */
const updateLeadContacted = async (leadId, contacted) => {
  return await prisma.truckingLead.update({
    where: { id: parseInt(leadId) },
    data:  { contacted },
  });
};

/**
 * Fetch all trucking leads without pagination for export.
 */
const getAllTruckingLeadsForExport = async () => {
  return await prisma.truckingLead.findMany({
    orderBy: { usdotNumber: 'asc' },
  });
};

module.exports = { startFmcsaScraping, getTruckingJobs, getTruckingLeads, deleteTruckingJob, getAllTruckingLeadsForExport, updateLeadContacted };

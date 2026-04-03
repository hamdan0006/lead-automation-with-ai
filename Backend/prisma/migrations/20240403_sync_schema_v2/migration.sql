-- CreateTable
CREATE TABLE "scraping_jobs" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "results" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "leadType" TEXT,

    CONSTRAINT "scraping_jobs_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "followUp" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "followUpDate" TIMESTAMP(3),
ADD COLUMN     "followUpSent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isResponsive" BOOLEAN,
ADD COLUMN     "keyword" TEXT,
ADD COLUMN     "lastEmailedAt" TIMESTAMP(3),
ADD COLUMN     "leadType" TEXT,
ADD COLUMN     "loadTime" DOUBLE PRECISION,
ADD COLUMN     "ownerName" TEXT,
ADD COLUMN     "rating" DOUBLE PRECISION,
ADD COLUMN     "receivedReply" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reviews" INTEGER,
ADD COLUMN     "scrapingJobId" INTEGER,
ADD COLUMN     "seoDescription" TEXT,
ADD COLUMN     "seoTitle" TEXT;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_scrapingJobId_fkey" FOREIGN KEY ("scrapingJobId") REFERENCES "scraping_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE IF NOT EXISTS "scraping_jobs" (
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
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='followUp') THEN
        ALTER TABLE "leads" ADD COLUMN "followUp" BOOLEAN NOT NULL DEFAULT true;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='followUpDate') THEN
        ALTER TABLE "leads" ADD COLUMN "followUpDate" TIMESTAMP(3);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='followUpSent') THEN
        ALTER TABLE "leads" ADD COLUMN "followUpSent" BOOLEAN NOT NULL DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='isResponsive') THEN
        ALTER TABLE "leads" ADD COLUMN "isResponsive" BOOLEAN;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='keyword') THEN
        ALTER TABLE "leads" ADD COLUMN "keyword" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='lastEmailedAt') THEN
        ALTER TABLE "leads" ADD COLUMN "lastEmailedAt" TIMESTAMP(3);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='leadType') THEN
        ALTER TABLE "leads" ADD COLUMN "leadType" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='loadTime') THEN
        ALTER TABLE "leads" ADD COLUMN "loadTime" DOUBLE PRECISION;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='ownerName') THEN
        ALTER TABLE "leads" ADD COLUMN "ownerName" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='rating') THEN
        ALTER TABLE "leads" ADD COLUMN "rating" DOUBLE PRECISION;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='receivedReply') THEN
        ALTER TABLE "leads" ADD COLUMN "receivedReply" BOOLEAN NOT NULL DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='reviews') THEN
        ALTER TABLE "leads" ADD COLUMN "reviews" INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='scrapingJobId') THEN
        ALTER TABLE "leads" ADD COLUMN "scrapingJobId" INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='seoDescription') THEN
        ALTER TABLE "leads" ADD COLUMN "seoDescription" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='seoTitle') THEN
        ALTER TABLE "leads" ADD COLUMN "seoTitle" TEXT;
    END IF;
END $$;

-- AddForeignKey
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='leads_scrapingJobId_fkey') THEN
        ALTER TABLE "leads" ADD CONSTRAINT "leads_scrapingJobId_fkey" FOREIGN KEY ("scrapingJobId") REFERENCES "scraping_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

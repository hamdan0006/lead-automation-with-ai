/*
  Warnings:

  - A unique constraint covering the columns `[uniqueKey]` on the table `leads` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "address" TEXT,
ADD COLUMN     "contacted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "emailExtracted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mapsScraped" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "uniqueKey" TEXT,
ADD COLUMN     "website" TEXT,
ADD COLUMN     "websiteVisited" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "email" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "leads_uniqueKey_key" ON "leads"("uniqueKey");

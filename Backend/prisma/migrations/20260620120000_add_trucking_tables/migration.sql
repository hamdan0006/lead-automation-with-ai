-- CreateTable
CREATE TABLE "trucking_jobs" (
    "id"         SERIAL NOT NULL,
    "fromDot"    INTEGER NOT NULL,
    "toDot"      INTEGER NOT NULL,
    "currentDot" INTEGER NOT NULL DEFAULT 0,
    "status"     TEXT NOT NULL DEFAULT 'PENDING',
    "results"    INTEGER NOT NULL DEFAULT 0,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trucking_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trucking_leads" (
    "id"               SERIAL NOT NULL,
    "usdotNumber"      INTEGER NOT NULL,
    "legalName"        TEXT,
    "dbaName"          TEXT,
    "address"          TEXT,
    "city"             TEXT,
    "state"            TEXT,
    "zip"              TEXT,
    "country"          TEXT,
    "phone"            TEXT,
    "mcNumber"         TEXT,
    "entityType"       TEXT,
    "operatingStatus"  TEXT,
    "driverCount"      INTEGER,
    "powerUnits"       INTEGER,
    "carrierOperation" TEXT,
    "operationClass"   TEXT,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "truckingJobId"    INTEGER,

    CONSTRAINT "trucking_leads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "trucking_leads_usdotNumber_key" ON "trucking_leads"("usdotNumber");

-- AddForeignKey
ALTER TABLE "trucking_leads" ADD CONSTRAINT "trucking_leads_truckingJobId_fkey"
    FOREIGN KEY ("truckingJobId") REFERENCES "trucking_jobs"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

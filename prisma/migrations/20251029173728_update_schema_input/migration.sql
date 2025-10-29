-- CreateTable
CREATE TABLE "InputSnapshot" (
    "id" SERIAL NOT NULL,
    "maturitySnapshotId" INTEGER NOT NULL,
    "metric" TEXT NOT NULL,
    "currentValue" DECIMAL(38,18),
    "previousValue" DECIMAL(38,18),
    "changePercentage" DECIMAL(38,18),
    "threshold" DECIMAL(38,18),
    "status" TEXT,
    "alert" BOOLEAN DEFAULT false,
    "source" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InputSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InputSnapshot_maturitySnapshotId_metric_idx" ON "InputSnapshot"("maturitySnapshotId", "metric");

-- AddForeignKey
ALTER TABLE "InputSnapshot" ADD CONSTRAINT "InputSnapshot_maturitySnapshotId_fkey" FOREIGN KEY ("maturitySnapshotId") REFERENCES "MaturitySnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "RebalanceSignal" AS ENUM ('REBALANCE', 'HOLD');

-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "lpPoolTargetAllocation" DECIMAL(38,18);

-- CreateTable
CREATE TABLE "LpPoolSnapshot" (
    "id" SERIAL NOT NULL,
    "maturitySnapshotId" INTEGER NOT NULL,
    "tvl" DECIMAL(38,18),
    "apy" DECIMAL(38,18),
    "volume24h" DECIMAL(38,18),
    "ourAllocation" DECIMAL(38,18),
    "ourSharePct" DECIMAL(38,18),
    "dailyFees" DECIMAL(38,18),
    "liquidityHealth" DECIMAL(38,18),
    "efficiencyScore" DECIMAL(38,18),
    "targetAllocation" DECIMAL(38,18),
    "rebalanceSignal" "RebalanceSignal",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LpPoolSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LpPoolSnapshot_maturitySnapshotId_key" ON "LpPoolSnapshot"("maturitySnapshotId");

-- CreateIndex
CREATE INDEX "LpPoolSnapshot_maturitySnapshotId_idx" ON "LpPoolSnapshot"("maturitySnapshotId");

-- AddForeignKey
ALTER TABLE "LpPoolSnapshot" ADD CONSTRAINT "LpPoolSnapshot_maturitySnapshotId_fkey" FOREIGN KEY ("maturitySnapshotId") REFERENCES "MaturitySnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

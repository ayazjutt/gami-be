/*
  Warnings:

  - Added the required column `maturitySnapshotId` to the `LPPoolsSnapshot` table without a default value. This is not possible if the table is not empty.
  - Added the required column `maturitySnapshotId` to the `PTTrackingSnapshot` table without a default value. This is not possible if the table is not empty.
  - Added the required column `maturitySnapshotId` to the `YTTrackingSnapshot` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "LPPoolsSnapshot" ADD COLUMN     "maturitySnapshotId" INTEGER NOT NULL,
ALTER COLUMN "tenureId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "PTTrackingSnapshot" ADD COLUMN     "maturitySnapshotId" INTEGER NOT NULL,
ALTER COLUMN "tenureId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "YTTrackingSnapshot" ADD COLUMN     "maturitySnapshotId" INTEGER NOT NULL,
ALTER COLUMN "tenureId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "LPPoolsSnapshot_maturitySnapshotId_idx" ON "LPPoolsSnapshot"("maturitySnapshotId");

-- CreateIndex
CREATE INDEX "PTTrackingSnapshot_maturitySnapshotId_idx" ON "PTTrackingSnapshot"("maturitySnapshotId");

-- CreateIndex
CREATE INDEX "YTTrackingSnapshot_maturitySnapshotId_idx" ON "YTTrackingSnapshot"("maturitySnapshotId");

-- AddForeignKey
ALTER TABLE "PTTrackingSnapshot" ADD CONSTRAINT "PTTrackingSnapshot_maturitySnapshotId_fkey" FOREIGN KEY ("maturitySnapshotId") REFERENCES "MaturitySnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "YTTrackingSnapshot" ADD CONSTRAINT "YTTrackingSnapshot_maturitySnapshotId_fkey" FOREIGN KEY ("maturitySnapshotId") REFERENCES "MaturitySnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LPPoolsSnapshot" ADD CONSTRAINT "LPPoolsSnapshot_maturitySnapshotId_fkey" FOREIGN KEY ("maturitySnapshotId") REFERENCES "MaturitySnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

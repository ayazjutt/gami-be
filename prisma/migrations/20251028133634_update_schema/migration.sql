/*
  Warnings:

  - You are about to drop the column `maturitySnapshotId` on the `OutputSnapshot` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."OutputSnapshot" DROP CONSTRAINT "OutputSnapshot_maturitySnapshotId_fkey";

-- DropIndex
DROP INDEX "public"."OutputSnapshot_maturitySnapshotId_outputMetricId_idx";

-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "isRemoved" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "OutputSnapshot" DROP COLUMN "maturitySnapshotId";

-- CreateIndex
CREATE INDEX "OutputSnapshot_outputMetricId_idx" ON "OutputSnapshot"("outputMetricId");

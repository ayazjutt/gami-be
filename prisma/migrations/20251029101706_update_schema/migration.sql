/*
  Warnings:

  - You are about to drop the column `maturitySnapshotId` on the `AlertSnapshot` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."AlertSnapshot" DROP CONSTRAINT "AlertSnapshot_maturitySnapshotId_fkey";

-- DropIndex
DROP INDEX "public"."AlertSnapshot_maturitySnapshotId_alertMetricId_idx";

-- AlterTable
ALTER TABLE "AlertSnapshot" DROP COLUMN "maturitySnapshotId";

-- CreateIndex
CREATE INDEX "AlertSnapshot_alertMetricId_idx" ON "AlertSnapshot"("alertMetricId");

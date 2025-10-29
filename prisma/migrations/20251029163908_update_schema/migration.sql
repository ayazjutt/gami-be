/*
  Warnings:

  - You are about to drop the column `tenureId` on the `MaturitySnapshot` table. All the data in the column will be lost.
  - You are about to drop the `AlertMetric` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AlertSnapshot` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `InputMetric` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `InputRole` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `InputSnapshot` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `LPPoolsSnapshot` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `OutputMetric` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `OutputSnapshot` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PTTrackingSnapshot` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SpectraSnapshot` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Tenure` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `YTTrackingSnapshot` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."AlertSnapshot" DROP CONSTRAINT "AlertSnapshot_alertMetricId_fkey";

-- DropForeignKey
ALTER TABLE "public"."InputSnapshot" DROP CONSTRAINT "InputSnapshot_inputMetricId_fkey";

-- DropForeignKey
ALTER TABLE "public"."InputSnapshot" DROP CONSTRAINT "InputSnapshot_inputRoleId_fkey";

-- DropForeignKey
ALTER TABLE "public"."InputSnapshot" DROP CONSTRAINT "InputSnapshot_maturitySnapshotId_fkey";

-- DropForeignKey
ALTER TABLE "public"."LPPoolsSnapshot" DROP CONSTRAINT "LPPoolsSnapshot_maturitySnapshotId_fkey";

-- DropForeignKey
ALTER TABLE "public"."LPPoolsSnapshot" DROP CONSTRAINT "LPPoolsSnapshot_tenureId_fkey";

-- DropForeignKey
ALTER TABLE "public"."MaturitySnapshot" DROP CONSTRAINT "MaturitySnapshot_tenureId_fkey";

-- DropForeignKey
ALTER TABLE "public"."OutputSnapshot" DROP CONSTRAINT "OutputSnapshot_outputMetricId_fkey";

-- DropForeignKey
ALTER TABLE "public"."PTTrackingSnapshot" DROP CONSTRAINT "PTTrackingSnapshot_maturitySnapshotId_fkey";

-- DropForeignKey
ALTER TABLE "public"."PTTrackingSnapshot" DROP CONSTRAINT "PTTrackingSnapshot_tenureId_fkey";

-- DropForeignKey
ALTER TABLE "public"."SpectraSnapshot" DROP CONSTRAINT "SpectraSnapshot_tenureId_fkey";

-- DropForeignKey
ALTER TABLE "public"."YTTrackingSnapshot" DROP CONSTRAINT "YTTrackingSnapshot_maturitySnapshotId_fkey";

-- DropForeignKey
ALTER TABLE "public"."YTTrackingSnapshot" DROP CONSTRAINT "YTTrackingSnapshot_tenureId_fkey";

-- DropIndex
DROP INDEX "public"."MaturitySnapshot_tenureId_idx";

-- AlterTable
ALTER TABLE "MaturitySnapshot" DROP COLUMN "tenureId";

-- DropTable
DROP TABLE "public"."AlertMetric";

-- DropTable
DROP TABLE "public"."AlertSnapshot";

-- DropTable
DROP TABLE "public"."InputMetric";

-- DropTable
DROP TABLE "public"."InputRole";

-- DropTable
DROP TABLE "public"."InputSnapshot";

-- DropTable
DROP TABLE "public"."LPPoolsSnapshot";

-- DropTable
DROP TABLE "public"."OutputMetric";

-- DropTable
DROP TABLE "public"."OutputSnapshot";

-- DropTable
DROP TABLE "public"."PTTrackingSnapshot";

-- DropTable
DROP TABLE "public"."SpectraSnapshot";

-- DropTable
DROP TABLE "public"."Tenure";

-- DropTable
DROP TABLE "public"."YTTrackingSnapshot";

-- DropEnum
DROP TYPE "public"."ActionRequired";

-- DropEnum
DROP TYPE "public"."ArbitrageSignal";

-- DropEnum
DROP TYPE "public"."AutoAction";

-- DropEnum
DROP TYPE "public"."ClaimSignal";

-- DropEnum
DROP TYPE "public"."GenericAction";

-- DropEnum
DROP TYPE "public"."HarvestSignal";

-- DropEnum
DROP TYPE "public"."ManualReview";

-- DropEnum
DROP TYPE "public"."Priority";

-- DropEnum
DROP TYPE "public"."RebalanceSignal";

/*
  Warnings:

  - The primary key for the `Asset` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `createdAt` on the `Asset` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Asset` table. All the data in the column will be lost.
  - The `id` column on the `Asset` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `MaturitySnapshot` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `asOf` on the `MaturitySnapshot` table. All the data in the column will be lost.
  - You are about to drop the column `daysRemaining` on the `MaturitySnapshot` table. All the data in the column will be lost.
  - You are about to drop the column `maturityDate` on the `MaturitySnapshot` table. All the data in the column will be lost.
  - You are about to drop the column `migrationCostUsd` on the `MaturitySnapshot` table. All the data in the column will be lost.
  - You are about to drop the column `newPoolAvailable` on the `MaturitySnapshot` table. All the data in the column will be lost.
  - You are about to drop the column `poolId` on the `MaturitySnapshot` table. All the data in the column will be lost.
  - You are about to drop the column `rolloverAlert` on the `MaturitySnapshot` table. All the data in the column will be lost.
  - You are about to drop the column `runId` on the `MaturitySnapshot` table. All the data in the column will be lost.
  - The `id` column on the `MaturitySnapshot` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `Setting` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `createdAt` on the `Setting` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Setting` table. All the data in the column will be lost.
  - You are about to drop the `Alert` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AllocationTarget` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ClaimLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `GasSnapshot` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `HarvestLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `IngestionRun` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `LPPosition` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `LPSnapshot` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MetricSnapshot` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PTSnapshot` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Pool` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PoolSnapshot` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PrincipalToken` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RevenueSnapshot` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RewardSnapshot` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RewardStream` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TokenPrice` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `YTSnapshot` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `YieldToken` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[networkId,address]` on the table `Asset` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[key]` on the table `Setting` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `address` to the `Asset` table without a default value. This is not possible if the table is not empty.
  - Added the required column `networkId` to the `Asset` table without a default value. This is not possible if the table is not empty.
  - Added the required column `assetId` to the `MaturitySnapshot` table without a default value. This is not possible if the table is not empty.
  - Added the required column `maturityTs` to the `MaturitySnapshot` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `MaturitySnapshot` table without a default value. This is not possible if the table is not empty.
  - Added the required column `payload` to the `MaturitySnapshot` table without a default value. This is not possible if the table is not empty.
  - Added the required column `source` to the `MaturitySnapshot` table without a default value. This is not possible if the table is not empty.
  - Added the required column `symbol` to the `MaturitySnapshot` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ActionRequired" AS ENUM ('NONE', 'MONITOR', 'REBALANCE', 'HARVEST', 'CLAIM', 'HEDGE', 'ALLOCATE', 'DEALLOCATE');

-- CreateEnum
CREATE TYPE "AutoAction" AS ENUM ('NONE', 'REBALANCE', 'HARVEST', 'CLAIM', 'SWAP');

-- CreateEnum
CREATE TYPE "ManualReview" AS ENUM ('NONE', 'REVIEW', 'ESCALATE', 'APPROVE', 'REJECT');

-- CreateEnum
CREATE TYPE "ArbitrageSignal" AS ENUM ('NONE', 'BUY_PT', 'SELL_PT', 'BUY_YT', 'SELL_YT', 'ARB_OPPORTUNITY');

-- CreateEnum
CREATE TYPE "GenericAction" AS ENUM ('NONE', 'BUY', 'SELL', 'HOLD', 'HARVEST', 'REBALANCE', 'CLAIM');

-- CreateEnum
CREATE TYPE "HarvestSignal" AS ENUM ('NONE', 'READY', 'WAIT');

-- CreateEnum
CREATE TYPE "RebalanceSignal" AS ENUM ('NONE', 'INCREASE', 'DECREASE', 'ENTER', 'EXIT');

-- CreateEnum
CREATE TYPE "ClaimSignal" AS ENUM ('NONE', 'CLAIM_NOW', 'WAIT');

-- DropForeignKey
ALTER TABLE "public"."Alert" DROP CONSTRAINT "Alert_poolId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ClaimLog" DROP CONSTRAINT "ClaimLog_rewardId_fkey";

-- DropForeignKey
ALTER TABLE "public"."GasSnapshot" DROP CONSTRAINT "GasSnapshot_poolId_fkey";

-- DropForeignKey
ALTER TABLE "public"."GasSnapshot" DROP CONSTRAINT "GasSnapshot_runId_fkey";

-- DropForeignKey
ALTER TABLE "public"."HarvestLog" DROP CONSTRAINT "HarvestLog_ytTokenId_fkey";

-- DropForeignKey
ALTER TABLE "public"."LPPosition" DROP CONSTRAINT "LPPosition_poolId_fkey";

-- DropForeignKey
ALTER TABLE "public"."LPSnapshot" DROP CONSTRAINT "LPSnapshot_poolId_fkey";

-- DropForeignKey
ALTER TABLE "public"."LPSnapshot" DROP CONSTRAINT "LPSnapshot_runId_fkey";

-- DropForeignKey
ALTER TABLE "public"."MaturitySnapshot" DROP CONSTRAINT "MaturitySnapshot_poolId_fkey";

-- DropForeignKey
ALTER TABLE "public"."MaturitySnapshot" DROP CONSTRAINT "MaturitySnapshot_runId_fkey";

-- DropForeignKey
ALTER TABLE "public"."MetricSnapshot" DROP CONSTRAINT "MetricSnapshot_poolId_fkey";

-- DropForeignKey
ALTER TABLE "public"."MetricSnapshot" DROP CONSTRAINT "MetricSnapshot_runId_fkey";

-- DropForeignKey
ALTER TABLE "public"."PTSnapshot" DROP CONSTRAINT "PTSnapshot_poolId_fkey";

-- DropForeignKey
ALTER TABLE "public"."PTSnapshot" DROP CONSTRAINT "PTSnapshot_runId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Pool" DROP CONSTRAINT "Pool_underlyingAssetId_fkey";

-- DropForeignKey
ALTER TABLE "public"."PoolSnapshot" DROP CONSTRAINT "PoolSnapshot_poolId_fkey";

-- DropForeignKey
ALTER TABLE "public"."PoolSnapshot" DROP CONSTRAINT "PoolSnapshot_runId_fkey";

-- DropForeignKey
ALTER TABLE "public"."PrincipalToken" DROP CONSTRAINT "PrincipalToken_poolId_fkey";

-- DropForeignKey
ALTER TABLE "public"."RewardSnapshot" DROP CONSTRAINT "RewardSnapshot_poolId_fkey";

-- DropForeignKey
ALTER TABLE "public"."RewardSnapshot" DROP CONSTRAINT "RewardSnapshot_runId_fkey";

-- DropForeignKey
ALTER TABLE "public"."RewardStream" DROP CONSTRAINT "RewardStream_poolId_fkey";

-- DropForeignKey
ALTER TABLE "public"."YTSnapshot" DROP CONSTRAINT "YTSnapshot_poolId_fkey";

-- DropForeignKey
ALTER TABLE "public"."YTSnapshot" DROP CONSTRAINT "YTSnapshot_runId_fkey";

-- DropForeignKey
ALTER TABLE "public"."YieldToken" DROP CONSTRAINT "YieldToken_poolId_fkey";

-- DropIndex
DROP INDEX "public"."Asset_symbol_key";

-- DropIndex
DROP INDEX "public"."MaturitySnapshot_asOf_idx";

-- DropIndex
DROP INDEX "public"."MaturitySnapshot_poolId_asOf_key";

-- AlterTable
ALTER TABLE "Asset" DROP CONSTRAINT "Asset_pkey",
DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "address" TEXT NOT NULL,
ADD COLUMN     "networkId" INTEGER NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "Asset_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "MaturitySnapshot" DROP CONSTRAINT "MaturitySnapshot_pkey",
DROP COLUMN "asOf",
DROP COLUMN "daysRemaining",
DROP COLUMN "maturityDate",
DROP COLUMN "migrationCostUsd",
DROP COLUMN "newPoolAvailable",
DROP COLUMN "poolId",
DROP COLUMN "rolloverAlert",
DROP COLUMN "runId",
ADD COLUMN     "assetId" INTEGER NOT NULL,
ADD COLUMN     "balance" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "ibtAddress" TEXT,
ADD COLUMN     "maturityCreatedAt" TIMESTAMP(3),
ADD COLUMN     "maturityTs" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "payload" JSONB NOT NULL,
ADD COLUMN     "pools" JSONB,
ADD COLUMN     "ptAddress" TEXT,
ADD COLUMN     "source" TEXT NOT NULL,
ADD COLUMN     "symbol" TEXT NOT NULL,
ADD COLUMN     "tenureId" INTEGER,
ADD COLUMN     "ytAddress" TEXT,
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "MaturitySnapshot_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Setting" DROP CONSTRAINT "Setting_pkey",
DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "id" SERIAL NOT NULL,
ALTER COLUMN "value" DROP NOT NULL,
ADD CONSTRAINT "Setting_pkey" PRIMARY KEY ("id");

-- DropTable
DROP TABLE "public"."Alert";

-- DropTable
DROP TABLE "public"."AllocationTarget";

-- DropTable
DROP TABLE "public"."ClaimLog";

-- DropTable
DROP TABLE "public"."GasSnapshot";

-- DropTable
DROP TABLE "public"."HarvestLog";

-- DropTable
DROP TABLE "public"."IngestionRun";

-- DropTable
DROP TABLE "public"."LPPosition";

-- DropTable
DROP TABLE "public"."LPSnapshot";

-- DropTable
DROP TABLE "public"."MetricSnapshot";

-- DropTable
DROP TABLE "public"."PTSnapshot";

-- DropTable
DROP TABLE "public"."Pool";

-- DropTable
DROP TABLE "public"."PoolSnapshot";

-- DropTable
DROP TABLE "public"."PrincipalToken";

-- DropTable
DROP TABLE "public"."RevenueSnapshot";

-- DropTable
DROP TABLE "public"."RewardSnapshot";

-- DropTable
DROP TABLE "public"."RewardStream";

-- DropTable
DROP TABLE "public"."TokenPrice";

-- DropTable
DROP TABLE "public"."YTSnapshot";

-- DropTable
DROP TABLE "public"."YieldToken";

-- DropEnum
DROP TYPE "public"."ActionType";

-- DropEnum
DROP TYPE "public"."AlertPriority";

-- DropEnum
DROP TYPE "public"."AlertStatus";

-- DropEnum
DROP TYPE "public"."AlertType";

-- DropEnum
DROP TYPE "public"."Chain";

-- DropEnum
DROP TYPE "public"."NetworkSlug";

-- DropEnum
DROP TYPE "public"."Tenor";

-- CreateTable
CREATE TABLE "Network" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "chainId" INTEGER,

    CONSTRAINT "Network_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tenure" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,

    CONSTRAINT "Tenure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InputRole" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,

    CONSTRAINT "InputRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InputMetric" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,

    CONSTRAINT "InputMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InputSnapshot" (
    "id" SERIAL NOT NULL,
    "maturitySnapshotId" INTEGER NOT NULL,
    "inputRoleId" INTEGER NOT NULL,
    "inputMetricId" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "metric" TEXT,
    "currentValue" DECIMAL(38,18),
    "previousValue" DECIMAL(38,18),
    "changePct" DECIMAL(38,18),
    "threshold" DECIMAL(38,18),
    "status" TEXT,
    "alert" BOOLEAN DEFAULT false,
    "source" TEXT,
    "notes" TEXT,

    CONSTRAINT "InputSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutputMetric" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,

    CONSTRAINT "OutputMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutputSnapshot" (
    "id" SERIAL NOT NULL,
    "maturitySnapshotId" INTEGER NOT NULL,
    "outputMetricId" INTEGER NOT NULL,
    "currentValue" DECIMAL(38,18),
    "target" DECIMAL(38,18),
    "benchmark" DECIMAL(38,18),
    "vsTarget" DECIMAL(38,18),
    "vsBenchmark" DECIMAL(38,18),
    "status" TEXT,
    "trend" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutputSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertMetric" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,

    CONSTRAINT "AlertMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertSnapshot" (
    "id" SERIAL NOT NULL,
    "maturitySnapshotId" INTEGER NOT NULL,
    "alertMetricId" INTEGER NOT NULL,
    "alertType" TEXT,
    "conditionMet" BOOLEAN NOT NULL DEFAULT false,
    "currentValue" DECIMAL(38,18),
    "threshold" DECIMAL(38,18),
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "actionRequired" "ActionRequired" NOT NULL DEFAULT 'MONITOR',
    "autoAction" "AutoAction" NOT NULL DEFAULT 'NONE',
    "manualReview" "ManualReview" NOT NULL DEFAULT 'REVIEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlertSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PTTrackingSnapshot" (
    "id" SERIAL NOT NULL,
    "tenureId" INTEGER NOT NULL,
    "maturity" TIMESTAMP(3) NOT NULL,
    "marketPrice" DECIMAL(38,18),
    "fairValue" DECIMAL(38,18),
    "mispricingPct" DECIMAL(38,18),
    "impliedApy" DECIMAL(38,18),
    "liquidityScore" DECIMAL(38,18),
    "bidAskSpread" DECIMAL(38,18),
    "volume24h" DECIMAL(38,18),
    "arbitrageSignal" "ArbitrageSignal" NOT NULL DEFAULT 'NONE',
    "action" "GenericAction" NOT NULL DEFAULT 'NONE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PTTrackingSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "YTTrackingSnapshot" (
    "id" SERIAL NOT NULL,
    "tenureId" INTEGER NOT NULL,
    "maturity" TIMESTAMP(3) NOT NULL,
    "marketPrice" DECIMAL(38,18),
    "impliedApy" DECIMAL(38,18),
    "accumulatedYield" DECIMAL(38,18),
    "harvestThreshold" DECIMAL(38,18),
    "daysSinceHarvest" INTEGER,
    "dailyYieldEst" DECIMAL(38,18),
    "harvestSignal" "HarvestSignal" NOT NULL DEFAULT 'NONE',
    "gasCostEst" DECIMAL(38,18),
    "netValue" DECIMAL(38,18),
    "action" "GenericAction" NOT NULL DEFAULT 'NONE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "YTTrackingSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LPPoolsSnapshot" (
    "id" SERIAL NOT NULL,
    "tenureId" INTEGER NOT NULL,
    "pool" TEXT NOT NULL,
    "tvl" DECIMAL(38,18),
    "apy" DECIMAL(38,18),
    "volume24h" DECIMAL(38,18),
    "ourAllocation" DECIMAL(38,18),
    "ourSharePct" DECIMAL(38,18),
    "dailyFees" DECIMAL(38,18),
    "liquidityHealth" TEXT,
    "efficiencyScore" DECIMAL(38,18),
    "targetAllocation" DECIMAL(38,18),
    "rebalanceSignal" "RebalanceSignal" NOT NULL DEFAULT 'NONE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LPPoolsSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpectraSnapshot" (
    "id" SERIAL NOT NULL,
    "tenureId" INTEGER NOT NULL,
    "pool" TEXT NOT NULL,
    "spectraPerDay" DECIMAL(38,18),
    "accumulated" DECIMAL(38,18),
    "usdValue" DECIMAL(38,18),
    "claimThreshold" DECIMAL(38,18),
    "daysSinceClaim" INTEGER,
    "claimSignal" "ClaimSignal" NOT NULL DEFAULT 'NONE',
    "veSpectraBoost" DECIMAL(38,18),
    "action" "GenericAction" NOT NULL DEFAULT 'NONE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpectraSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Network_name_key" ON "Network"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Network_slug_key" ON "Network"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Network_chainId_key" ON "Network"("chainId");

-- CreateIndex
CREATE INDEX "Network_slug_idx" ON "Network"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Tenure_title_key" ON "Tenure"("title");

-- CreateIndex
CREATE UNIQUE INDEX "InputRole_title_key" ON "InputRole"("title");

-- CreateIndex
CREATE UNIQUE INDEX "InputMetric_title_key" ON "InputMetric"("title");

-- CreateIndex
CREATE INDEX "InputSnapshot_maturitySnapshotId_inputRoleId_inputMetricId_idx" ON "InputSnapshot"("maturitySnapshotId", "inputRoleId", "inputMetricId");

-- CreateIndex
CREATE UNIQUE INDEX "OutputMetric_title_key" ON "OutputMetric"("title");

-- CreateIndex
CREATE INDEX "OutputSnapshot_maturitySnapshotId_outputMetricId_idx" ON "OutputSnapshot"("maturitySnapshotId", "outputMetricId");

-- CreateIndex
CREATE UNIQUE INDEX "AlertMetric_title_key" ON "AlertMetric"("title");

-- CreateIndex
CREATE INDEX "AlertSnapshot_maturitySnapshotId_alertMetricId_idx" ON "AlertSnapshot"("maturitySnapshotId", "alertMetricId");

-- CreateIndex
CREATE INDEX "PTTrackingSnapshot_tenureId_maturity_idx" ON "PTTrackingSnapshot"("tenureId", "maturity");

-- CreateIndex
CREATE INDEX "YTTrackingSnapshot_tenureId_maturity_idx" ON "YTTrackingSnapshot"("tenureId", "maturity");

-- CreateIndex
CREATE INDEX "LPPoolsSnapshot_tenureId_pool_idx" ON "LPPoolsSnapshot"("tenureId", "pool");

-- CreateIndex
CREATE INDEX "SpectraSnapshot_tenureId_pool_idx" ON "SpectraSnapshot"("tenureId", "pool");

-- CreateIndex
CREATE INDEX "Asset_networkId_idx" ON "Asset"("networkId");

-- CreateIndex
CREATE INDEX "Asset_symbol_idx" ON "Asset"("symbol");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_networkId_address_key" ON "Asset"("networkId", "address");

-- CreateIndex
CREATE INDEX "MaturitySnapshot_assetId_maturityTs_idx" ON "MaturitySnapshot"("assetId", "maturityTs");

-- CreateIndex
CREATE INDEX "MaturitySnapshot_tenureId_idx" ON "MaturitySnapshot"("tenureId");

-- CreateIndex
CREATE UNIQUE INDEX "Setting_key_key" ON "Setting"("key");

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "Network"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaturitySnapshot" ADD CONSTRAINT "MaturitySnapshot_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaturitySnapshot" ADD CONSTRAINT "MaturitySnapshot_tenureId_fkey" FOREIGN KEY ("tenureId") REFERENCES "Tenure"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InputSnapshot" ADD CONSTRAINT "InputSnapshot_maturitySnapshotId_fkey" FOREIGN KEY ("maturitySnapshotId") REFERENCES "MaturitySnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InputSnapshot" ADD CONSTRAINT "InputSnapshot_inputRoleId_fkey" FOREIGN KEY ("inputRoleId") REFERENCES "InputRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InputSnapshot" ADD CONSTRAINT "InputSnapshot_inputMetricId_fkey" FOREIGN KEY ("inputMetricId") REFERENCES "InputMetric"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutputSnapshot" ADD CONSTRAINT "OutputSnapshot_maturitySnapshotId_fkey" FOREIGN KEY ("maturitySnapshotId") REFERENCES "MaturitySnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutputSnapshot" ADD CONSTRAINT "OutputSnapshot_outputMetricId_fkey" FOREIGN KEY ("outputMetricId") REFERENCES "OutputMetric"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertSnapshot" ADD CONSTRAINT "AlertSnapshot_maturitySnapshotId_fkey" FOREIGN KEY ("maturitySnapshotId") REFERENCES "MaturitySnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertSnapshot" ADD CONSTRAINT "AlertSnapshot_alertMetricId_fkey" FOREIGN KEY ("alertMetricId") REFERENCES "AlertMetric"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PTTrackingSnapshot" ADD CONSTRAINT "PTTrackingSnapshot_tenureId_fkey" FOREIGN KEY ("tenureId") REFERENCES "Tenure"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "YTTrackingSnapshot" ADD CONSTRAINT "YTTrackingSnapshot_tenureId_fkey" FOREIGN KEY ("tenureId") REFERENCES "Tenure"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LPPoolsSnapshot" ADD CONSTRAINT "LPPoolsSnapshot_tenureId_fkey" FOREIGN KEY ("tenureId") REFERENCES "Tenure"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpectraSnapshot" ADD CONSTRAINT "SpectraSnapshot_tenureId_fkey" FOREIGN KEY ("tenureId") REFERENCES "Tenure"("id") ON DELETE CASCADE ON UPDATE CASCADE;

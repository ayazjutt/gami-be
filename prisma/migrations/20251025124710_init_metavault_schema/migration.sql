/*
  Warnings:

  - The primary key for the `Alert` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `alertType` on the `Alert` table. All the data in the column will be lost.
  - You are about to drop the column `data` on the `Alert` table. All the data in the column will be lost.
  - You are about to drop the column `entityId` on the `Alert` table. All the data in the column will be lost.
  - You are about to drop the column `entityType` on the `Alert` table. All the data in the column will be lost.
  - You are about to drop the column `message` on the `Alert` table. All the data in the column will be lost.
  - You are about to drop the column `severity` on the `Alert` table. All the data in the column will be lost.
  - You are about to drop the column `ts` on the `Alert` table. All the data in the column will be lost.
  - The primary key for the `Asset` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `discoveredAt` on the `Asset` table. All the data in the column will be lost.
  - You are about to drop the column `ibtAddress` on the `Asset` table. All the data in the column will be lost.
  - You are about to drop the column `networkId` on the `Asset` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Asset` table. All the data in the column will be lost.
  - You are about to drop the column `symbolCanonical` on the `Asset` table. All the data in the column will be lost.
  - You are about to drop the column `symbolDisplay` on the `Asset` table. All the data in the column will be lost.
  - The primary key for the `Pool` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `feeRateBps` on the `Pool` table. All the data in the column will be lost.
  - You are about to drop the column `maturityId` on the `Pool` table. All the data in the column will be lost.
  - You are about to drop the column `poolType` on the `Pool` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Pool` table. All the data in the column will be lost.
  - You are about to drop the `InputMetric` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `LpSnapshot` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Maturity` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Network` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PortfolioAllocation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PortfolioAsset` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PortfolioDailyMetric` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PortfolioIntervalMetric` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PtSnapshot` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `YtSnapshot` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[symbol]` on the table `Asset` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[externalKey]` on the table `Pool` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[networkSlug,poolAddress]` on the table `Pool` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `type` to the `Alert` table without a default value. This is not possible if the table is not empty.
  - Added the required column `decimals` to the `Asset` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `Asset` table without a default value. This is not possible if the table is not empty.
  - Added the required column `symbol` to the `Asset` table without a default value. This is not possible if the table is not empty.
  - Made the column `updatedAt` on table `Asset` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `externalKey` to the `Pool` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `Pool` table without a default value. This is not possible if the table is not empty.
  - Added the required column `networkSlug` to the `Pool` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenor` to the `Pool` table without a default value. This is not possible if the table is not empty.
  - Added the required column `underlyingAssetId` to the `Pool` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Pool` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Chain" AS ENUM ('MAINNET', 'ARBITRUM', 'OPTIMISM', 'BASE', 'SONIC', 'HEMI', 'HYPEREVM', 'AVALANCHE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "NetworkSlug" AS ENUM ('mainnet', 'arbitrum', 'optimism', 'base', 'sonic', 'hemi', 'hyperevm', 'avalanche');

-- CreateEnum
CREATE TYPE "Tenor" AS ENUM ('THREE_M', 'SIX_M', 'TWELVE_M');

-- CreateEnum
CREATE TYPE "AlertPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('PT_MISPRICING', 'YT_HARVEST', 'LIQUIDITY_CRISIS', 'GAS_SPIKE', 'MATURITY_ALERT', 'REBALANCE');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('OK', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ActionType" AS ENUM ('BUY_PT', 'SELL_PT', 'HARVEST', 'CLAIM', 'ROLLOVER', 'REBALANCE_UP', 'REBALANCE_DOWN', 'WAIT', 'HOLD');

-- DropForeignKey
ALTER TABLE "public"."Asset" DROP CONSTRAINT "Asset_networkId_fkey";

-- DropForeignKey
ALTER TABLE "public"."LpSnapshot" DROP CONSTRAINT "LpSnapshot_poolId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Maturity" DROP CONSTRAINT "Maturity_assetId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Pool" DROP CONSTRAINT "Pool_maturityId_fkey";

-- DropForeignKey
ALTER TABLE "public"."PortfolioAllocation" DROP CONSTRAINT "PortfolioAllocation_maturityId_fkey";

-- DropForeignKey
ALTER TABLE "public"."PortfolioAsset" DROP CONSTRAINT "PortfolioAsset_maturityId_fkey";

-- DropForeignKey
ALTER TABLE "public"."PtSnapshot" DROP CONSTRAINT "PtSnapshot_maturityId_fkey";

-- DropForeignKey
ALTER TABLE "public"."YtSnapshot" DROP CONSTRAINT "YtSnapshot_maturityId_fkey";

-- DropIndex
DROP INDEX "public"."Alert_ts_idx";

-- DropIndex
DROP INDEX "public"."Asset_networkId_ibtAddress_key";

-- DropIndex
DROP INDEX "public"."Pool_maturityId_poolType_key";

-- AlterTable
ALTER TABLE "Alert" DROP CONSTRAINT "Alert_pkey",
DROP COLUMN "alertType",
DROP COLUMN "data",
DROP COLUMN "entityId",
DROP COLUMN "entityType",
DROP COLUMN "message",
DROP COLUMN "severity",
DROP COLUMN "ts",
ADD COLUMN     "action" "ActionType",
ADD COLUMN     "autoAction" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "conditionMet" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "currentValue" DECIMAL(38,18),
ADD COLUMN     "manualReview" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "poolId" TEXT,
ADD COLUMN     "priority" "AlertPriority" NOT NULL DEFAULT 'MEDIUM',
ADD COLUMN     "threshold" DECIMAL(38,18),
ADD COLUMN     "type" "AlertType" NOT NULL,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "Alert_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Alert_id_seq";

-- AlterTable
ALTER TABLE "Asset" DROP CONSTRAINT "Asset_pkey",
DROP COLUMN "discoveredAt",
DROP COLUMN "ibtAddress",
DROP COLUMN "networkId",
DROP COLUMN "status",
DROP COLUMN "symbolCanonical",
DROP COLUMN "symbolDisplay",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "decimals" INTEGER NOT NULL,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "symbol" TEXT NOT NULL,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "updatedAt" SET NOT NULL,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3),
ADD CONSTRAINT "Asset_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Asset_id_seq";

-- AlterTable
ALTER TABLE "Pool" DROP CONSTRAINT "Pool_pkey",
DROP COLUMN "feeRateBps",
DROP COLUMN "maturityId",
DROP COLUMN "poolType",
DROP COLUMN "status",
ADD COLUMN     "chain" "Chain" NOT NULL DEFAULT 'UNKNOWN',
ADD COLUMN     "chainId" INTEGER,
ADD COLUMN     "disappearedAt" TIMESTAMP(3),
ADD COLUMN     "externalKey" TEXT NOT NULL,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isHidden" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastAPY" DECIMAL(38,18),
ADD COLUMN     "lastTVLUsd" DECIMAL(38,18),
ADD COLUMN     "lastVolume24h" DECIMAL(38,18),
ADD COLUMN     "maturityDate" TIMESTAMP(3),
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "networkSlug" "NetworkSlug" NOT NULL,
ADD COLUMN     "tenor" "Tenor" NOT NULL,
ADD COLUMN     "underlyingAssetId" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ADD CONSTRAINT "Pool_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Pool_id_seq";

-- DropTable
DROP TABLE "public"."InputMetric";

-- DropTable
DROP TABLE "public"."LpSnapshot";

-- DropTable
DROP TABLE "public"."Maturity";

-- DropTable
DROP TABLE "public"."Network";

-- DropTable
DROP TABLE "public"."PortfolioAllocation";

-- DropTable
DROP TABLE "public"."PortfolioAsset";

-- DropTable
DROP TABLE "public"."PortfolioDailyMetric";

-- DropTable
DROP TABLE "public"."PortfolioIntervalMetric";

-- DropTable
DROP TABLE "public"."PtSnapshot";

-- DropTable
DROP TABLE "public"."YtSnapshot";

-- DropEnum
DROP TYPE "public"."PoolType";

-- DropEnum
DROP TYPE "public"."Status";

-- CreateTable
CREATE TABLE "PrincipalToken" (
    "id" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "tokenAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrincipalToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "YieldToken" (
    "id" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "tokenAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "YieldToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LPPosition" (
    "id" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "allocationUsd" DECIMAL(38,18) NOT NULL,
    "ourSharePct" DECIMAL(38,18) NOT NULL,
    "feeRatePct" DECIMAL(10,6),
    "dailyFeesUsd" DECIMAL(38,18),
    "targetAllocationPct" DECIMAL(10,6),
    "rebalanceSignal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LPPosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewardStream" (
    "id" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "tokenSymbol" TEXT NOT NULL,
    "emissionPerDay" DECIMAL(38,18),
    "accumulated" DECIMAL(38,18),
    "tokenPriceUsd" DECIMAL(38,18),
    "usdValue" DECIMAL(38,18),
    "daysSinceClaim" INTEGER,
    "veBoost" DECIMAL(10,6),
    "claimSignal" BOOLEAN NOT NULL DEFAULT false,
    "recommendedAction" "ActionType",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RewardStream_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IngestionRun" (
    "id" TEXT NOT NULL,
    "label" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "ok" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "IngestionRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PoolSnapshot" (
    "id" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "asOf" TIMESTAMP(3) NOT NULL,
    "tvlUsd" DECIMAL(38,18),
    "apy" DECIMAL(38,18),
    "volume24hUsd" DECIMAL(38,18),

    CONSTRAINT "PoolSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PTSnapshot" (
    "id" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "asOf" TIMESTAMP(3) NOT NULL,
    "marketPrice" DECIMAL(38,18),
    "fairValue" DECIMAL(38,18),
    "mispricingPct" DECIMAL(38,18),
    "impliedApy" DECIMAL(38,18),
    "liquidityScore" INTEGER,
    "bidAskSpreadPct" DECIMAL(38,18),
    "volume24hUsd" DECIMAL(38,18),
    "arbitrageSignal" BOOLEAN NOT NULL DEFAULT false,
    "recommendedAction" "ActionType",

    CONSTRAINT "PTSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "YTSnapshot" (
    "id" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "asOf" TIMESTAMP(3) NOT NULL,
    "marketPrice" DECIMAL(38,18),
    "impliedApy" DECIMAL(38,18),
    "accumulatedValue" DECIMAL(38,18),
    "daysSinceHarvest" INTEGER,
    "dailyYieldEst" DECIMAL(38,18),
    "harvestSignal" BOOLEAN NOT NULL DEFAULT false,
    "gasCostEstUsd" DECIMAL(38,18),
    "netValueUsd" DECIMAL(38,18),
    "recommendedAction" "ActionType",

    CONSTRAINT "YTSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LPSnapshot" (
    "id" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "asOf" TIMESTAMP(3) NOT NULL,
    "allocationUsd" DECIMAL(38,18),
    "ourSharePct" DECIMAL(38,18),
    "dailyFeesUsd" DECIMAL(38,18),
    "liquidityHealth" INTEGER,
    "efficiencyScore" DECIMAL(38,18),
    "targetAllocationPct" DECIMAL(10,6),
    "rebalanceSignal" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "LPSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewardSnapshot" (
    "id" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "asOf" TIMESTAMP(3) NOT NULL,
    "emissionPerDay" DECIMAL(38,18),
    "accumulated" DECIMAL(38,18),
    "tokenPriceUsd" DECIMAL(38,18),
    "usdValue" DECIMAL(38,18),
    "daysSinceClaim" INTEGER,
    "veBoost" DECIMAL(10,6),
    "claimSignal" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "RewardSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GasSnapshot" (
    "id" TEXT NOT NULL,
    "poolId" TEXT,
    "runId" TEXT NOT NULL,
    "asOf" TIMESTAMP(3) NOT NULL,
    "chain" "Chain" NOT NULL DEFAULT 'UNKNOWN',
    "gwei" DECIMAL(38,18) NOT NULL,
    "ethPriceUsd" DECIMAL(38,18),
    "estimatedTxUsd" DECIMAL(38,18),

    CONSTRAINT "GasSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaturitySnapshot" (
    "id" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "asOf" TIMESTAMP(3) NOT NULL,
    "maturityDate" TIMESTAMP(3),
    "daysRemaining" INTEGER,
    "rolloverAlert" BOOLEAN NOT NULL DEFAULT false,
    "newPoolAvailable" BOOLEAN NOT NULL DEFAULT false,
    "migrationCostUsd" DECIMAL(38,18),

    CONSTRAINT "MaturitySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HarvestLog" (
    "id" TEXT NOT NULL,
    "ytTokenId" TEXT NOT NULL,
    "txHash" TEXT,
    "harvestedValueUsd" DECIMAL(38,18),
    "gasUsd" DECIMAL(38,18),
    "netUsd" DECIMAL(38,18),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HarvestLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClaimLog" (
    "id" TEXT NOT NULL,
    "rewardId" TEXT NOT NULL,
    "txHash" TEXT,
    "amount" DECIMAL(38,18),
    "tokenPriceUsd" DECIMAL(38,18),
    "usdValue" DECIMAL(38,18),
    "gasUsd" DECIMAL(38,18),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClaimLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TokenPrice" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "asOf" TIMESTAMP(3) NOT NULL,
    "priceUsd" DECIMAL(38,18) NOT NULL,
    "source" TEXT,

    CONSTRAINT "TokenPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetricSnapshot" (
    "id" TEXT NOT NULL,
    "poolId" TEXT,
    "runId" TEXT NOT NULL,
    "asOf" TIMESTAMP(3) NOT NULL,
    "metricKey" TEXT NOT NULL,
    "currentValue" DECIMAL(38,18),
    "previousValue" DECIMAL(38,18),
    "changePct" DECIMAL(38,18),
    "threshold" DECIMAL(38,18),
    "status" "AlertStatus",
    "alert" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT,
    "notes" TEXT,

    CONSTRAINT "MetricSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RevenueSnapshot" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "aumUsd" DECIMAL(38,18) NOT NULL,
    "dailyMgmtFeeUsd" DECIMAL(38,18) NOT NULL,
    "monthlyMgmtFeeUsd" DECIMAL(38,18) NOT NULL,
    "performanceFeeUsd" DECIMAL(38,18) NOT NULL,
    "otherRevenueUsd" DECIMAL(38,18) NOT NULL,
    "totalDailyUsd" DECIMAL(38,18) NOT NULL,
    "cumulativeUsd" DECIMAL(38,18) NOT NULL,
    "roiPct" DECIMAL(38,18) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RevenueSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "numValue" DECIMAL(38,18),
    "notes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "AllocationTarget" (
    "id" TEXT NOT NULL,
    "tenor" "Tenor" NOT NULL,
    "targetPct" DECIMAL(10,6) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AllocationTarget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PoolSnapshot_asOf_idx" ON "PoolSnapshot"("asOf");

-- CreateIndex
CREATE UNIQUE INDEX "PoolSnapshot_poolId_asOf_key" ON "PoolSnapshot"("poolId", "asOf");

-- CreateIndex
CREATE INDEX "PTSnapshot_asOf_idx" ON "PTSnapshot"("asOf");

-- CreateIndex
CREATE UNIQUE INDEX "PTSnapshot_poolId_asOf_key" ON "PTSnapshot"("poolId", "asOf");

-- CreateIndex
CREATE INDEX "YTSnapshot_asOf_idx" ON "YTSnapshot"("asOf");

-- CreateIndex
CREATE UNIQUE INDEX "YTSnapshot_poolId_asOf_key" ON "YTSnapshot"("poolId", "asOf");

-- CreateIndex
CREATE INDEX "LPSnapshot_asOf_idx" ON "LPSnapshot"("asOf");

-- CreateIndex
CREATE UNIQUE INDEX "LPSnapshot_poolId_asOf_key" ON "LPSnapshot"("poolId", "asOf");

-- CreateIndex
CREATE INDEX "RewardSnapshot_asOf_idx" ON "RewardSnapshot"("asOf");

-- CreateIndex
CREATE UNIQUE INDEX "RewardSnapshot_poolId_asOf_key" ON "RewardSnapshot"("poolId", "asOf");

-- CreateIndex
CREATE INDEX "GasSnapshot_chain_asOf_idx" ON "GasSnapshot"("chain", "asOf");

-- CreateIndex
CREATE INDEX "MaturitySnapshot_asOf_idx" ON "MaturitySnapshot"("asOf");

-- CreateIndex
CREATE UNIQUE INDEX "MaturitySnapshot_poolId_asOf_key" ON "MaturitySnapshot"("poolId", "asOf");

-- CreateIndex
CREATE UNIQUE INDEX "HarvestLog_txHash_key" ON "HarvestLog"("txHash");

-- CreateIndex
CREATE UNIQUE INDEX "ClaimLog_txHash_key" ON "ClaimLog"("txHash");

-- CreateIndex
CREATE INDEX "TokenPrice_asOf_idx" ON "TokenPrice"("asOf");

-- CreateIndex
CREATE UNIQUE INDEX "TokenPrice_symbol_asOf_key" ON "TokenPrice"("symbol", "asOf");

-- CreateIndex
CREATE INDEX "MetricSnapshot_metricKey_asOf_idx" ON "MetricSnapshot"("metricKey", "asOf");

-- CreateIndex
CREATE INDEX "MetricSnapshot_poolId_metricKey_asOf_idx" ON "MetricSnapshot"("poolId", "metricKey", "asOf");

-- CreateIndex
CREATE UNIQUE INDEX "RevenueSnapshot_date_key" ON "RevenueSnapshot"("date");

-- CreateIndex
CREATE UNIQUE INDEX "AllocationTarget_tenor_key" ON "AllocationTarget"("tenor");

-- CreateIndex
CREATE INDEX "Alert_type_createdAt_idx" ON "Alert"("type", "createdAt");

-- CreateIndex
CREATE INDEX "Alert_poolId_type_createdAt_idx" ON "Alert"("poolId", "type", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_symbol_key" ON "Asset"("symbol");

-- CreateIndex
CREATE UNIQUE INDEX "Pool_externalKey_key" ON "Pool"("externalKey");

-- CreateIndex
CREATE UNIQUE INDEX "Pool_networkSlug_poolAddress_key" ON "Pool"("networkSlug", "poolAddress");

-- AddForeignKey
ALTER TABLE "Pool" ADD CONSTRAINT "Pool_underlyingAssetId_fkey" FOREIGN KEY ("underlyingAssetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrincipalToken" ADD CONSTRAINT "PrincipalToken_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "Pool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "YieldToken" ADD CONSTRAINT "YieldToken_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "Pool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LPPosition" ADD CONSTRAINT "LPPosition_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "Pool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardStream" ADD CONSTRAINT "RewardStream_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "Pool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoolSnapshot" ADD CONSTRAINT "PoolSnapshot_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "Pool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoolSnapshot" ADD CONSTRAINT "PoolSnapshot_runId_fkey" FOREIGN KEY ("runId") REFERENCES "IngestionRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PTSnapshot" ADD CONSTRAINT "PTSnapshot_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "Pool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PTSnapshot" ADD CONSTRAINT "PTSnapshot_runId_fkey" FOREIGN KEY ("runId") REFERENCES "IngestionRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "YTSnapshot" ADD CONSTRAINT "YTSnapshot_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "Pool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "YTSnapshot" ADD CONSTRAINT "YTSnapshot_runId_fkey" FOREIGN KEY ("runId") REFERENCES "IngestionRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LPSnapshot" ADD CONSTRAINT "LPSnapshot_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "Pool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LPSnapshot" ADD CONSTRAINT "LPSnapshot_runId_fkey" FOREIGN KEY ("runId") REFERENCES "IngestionRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardSnapshot" ADD CONSTRAINT "RewardSnapshot_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "Pool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardSnapshot" ADD CONSTRAINT "RewardSnapshot_runId_fkey" FOREIGN KEY ("runId") REFERENCES "IngestionRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GasSnapshot" ADD CONSTRAINT "GasSnapshot_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "Pool"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GasSnapshot" ADD CONSTRAINT "GasSnapshot_runId_fkey" FOREIGN KEY ("runId") REFERENCES "IngestionRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaturitySnapshot" ADD CONSTRAINT "MaturitySnapshot_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "Pool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaturitySnapshot" ADD CONSTRAINT "MaturitySnapshot_runId_fkey" FOREIGN KEY ("runId") REFERENCES "IngestionRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HarvestLog" ADD CONSTRAINT "HarvestLog_ytTokenId_fkey" FOREIGN KEY ("ytTokenId") REFERENCES "YieldToken"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaimLog" ADD CONSTRAINT "ClaimLog_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "RewardStream"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetricSnapshot" ADD CONSTRAINT "MetricSnapshot_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "Pool"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetricSnapshot" ADD CONSTRAINT "MetricSnapshot_runId_fkey" FOREIGN KEY ("runId") REFERENCES "IngestionRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "Pool"("id") ON DELETE SET NULL ON UPDATE CASCADE;

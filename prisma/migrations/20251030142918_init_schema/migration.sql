/*
  Warnings:

  - You are about to drop the column `accumulated` on the `YtTrackingSnapshot` table. All the data in the column will be lost.
  - You are about to drop the column `claimSignal` on the `YtTrackingSnapshot` table. All the data in the column will be lost.
  - You are about to drop the column `claimThreshold` on the `YtTrackingSnapshot` table. All the data in the column will be lost.
  - You are about to drop the column `daysSinceClaim` on the `YtTrackingSnapshot` table. All the data in the column will be lost.
  - You are about to drop the column `spectraPerDay` on the `YtTrackingSnapshot` table. All the data in the column will be lost.
  - You are about to drop the column `usdValue` on the `YtTrackingSnapshot` table. All the data in the column will be lost.
  - You are about to drop the column `veSpectraBoost` on the `YtTrackingSnapshot` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "DailyYieldEst" AS ENUM ('HARVEST', 'WAIT');

-- AlterTable
ALTER TABLE "YtTrackingSnapshot" DROP COLUMN "accumulated",
DROP COLUMN "claimSignal",
DROP COLUMN "claimThreshold",
DROP COLUMN "daysSinceClaim",
DROP COLUMN "spectraPerDay",
DROP COLUMN "usdValue",
DROP COLUMN "veSpectraBoost",
ADD COLUMN     "accumulatedYield" DECIMAL(38,18),
ADD COLUMN     "dailyYieldEst" "DailyYieldEst",
ADD COLUMN     "daysSinceHarvest" INTEGER,
ADD COLUMN     "gasCostEst" DECIMAL(38,18),
ADD COLUMN     "harvestSignal" "ClaimSignal",
ADD COLUMN     "harvestThreshold" DECIMAL(38,18),
ADD COLUMN     "impliedApy" DECIMAL(38,18),
ADD COLUMN     "marketPrice" DECIMAL(38,18),
ADD COLUMN     "netValue" DECIMAL(38,18);

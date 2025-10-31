-- CreateEnum
CREATE TYPE "ArbitrageSignal" AS ENUM ('HOLD', 'BUY');

-- CreateEnum
CREATE TYPE "ArbitrageAction" AS ENUM ('HOLD', 'BUY');

-- CreateEnum
CREATE TYPE "ClaimSignal" AS ENUM ('CLAIM', 'WAIT');

-- CreateEnum
CREATE TYPE "ClaimAction" AS ENUM ('CLAIM', 'WAIT');

-- CreateTable
CREATE TABLE "Network" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "chainId" INTEGER,

    CONSTRAINT "Network_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" SERIAL NOT NULL,
    "networkId" INTEGER NOT NULL,
    "address" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "decimals" INTEGER NOT NULL,
    "isRemoved" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaturitySnapshot" (
    "id" SERIAL NOT NULL,
    "assetId" INTEGER NOT NULL,
    "maturityTs" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "ibtAddress" TEXT,
    "ytAddress" TEXT,
    "ptAddress" TEXT,
    "maturityCreatedAt" TIMESTAMP(3),
    "balance" TEXT,
    "pools" JSONB,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaturitySnapshot_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "PtTrackingSnapshot" (
    "id" SERIAL NOT NULL,
    "maturitySnapshotId" INTEGER NOT NULL,
    "marketPrice" DECIMAL(38,18),
    "fairValue" DECIMAL(38,18),
    "mispricingPct" DECIMAL(38,18),
    "impliedApy" DECIMAL(38,18),
    "liquidityScore" DECIMAL(38,18),
    "bidAskSpread" DECIMAL(38,18),
    "volume24h" DECIMAL(38,18),
    "arbitrageSignal" "ArbitrageSignal",
    "action" "ArbitrageAction",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PtTrackingSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "YtTrackingSnapshot" (
    "id" SERIAL NOT NULL,
    "maturitySnapshotId" INTEGER NOT NULL,
    "spectraPerDay" DECIMAL(38,18),
    "accumulated" DECIMAL(38,18),
    "usdValue" DECIMAL(38,18),
    "claimThreshold" DECIMAL(38,18),
    "daysSinceClaim" INTEGER,
    "claimSignal" "ClaimSignal",
    "veSpectraBoost" DECIMAL(38,18),
    "action" "ClaimAction",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "YtTrackingSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT,
    "numValue" DECIMAL(38,18),
    "notes" TEXT,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
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
CREATE INDEX "Asset_networkId_idx" ON "Asset"("networkId");

-- CreateIndex
CREATE INDEX "Asset_symbol_idx" ON "Asset"("symbol");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_networkId_address_key" ON "Asset"("networkId", "address");

-- CreateIndex
CREATE INDEX "MaturitySnapshot_assetId_maturityTs_idx" ON "MaturitySnapshot"("assetId", "maturityTs");

-- CreateIndex
CREATE INDEX "InputSnapshot_maturitySnapshotId_metric_idx" ON "InputSnapshot"("maturitySnapshotId", "metric");

-- CreateIndex
CREATE INDEX "PtTrackingSnapshot_maturitySnapshotId_idx" ON "PtTrackingSnapshot"("maturitySnapshotId");

-- CreateIndex
CREATE UNIQUE INDEX "PtTrackingSnapshot_maturitySnapshotId_key" ON "PtTrackingSnapshot"("maturitySnapshotId");

-- CreateIndex
CREATE UNIQUE INDEX "YtTrackingSnapshot_maturitySnapshotId_key" ON "YtTrackingSnapshot"("maturitySnapshotId");

-- CreateIndex
CREATE INDEX "YtTrackingSnapshot_maturitySnapshotId_idx" ON "YtTrackingSnapshot"("maturitySnapshotId");

-- CreateIndex
CREATE UNIQUE INDEX "Setting_key_key" ON "Setting"("key");

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "Network"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaturitySnapshot" ADD CONSTRAINT "MaturitySnapshot_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InputSnapshot" ADD CONSTRAINT "InputSnapshot_maturitySnapshotId_fkey" FOREIGN KEY ("maturitySnapshotId") REFERENCES "MaturitySnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PtTrackingSnapshot" ADD CONSTRAINT "PtTrackingSnapshot_maturitySnapshotId_fkey" FOREIGN KEY ("maturitySnapshotId") REFERENCES "MaturitySnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "YtTrackingSnapshot" ADD CONSTRAINT "YtTrackingSnapshot_maturitySnapshotId_fkey" FOREIGN KEY ("maturitySnapshotId") REFERENCES "MaturitySnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

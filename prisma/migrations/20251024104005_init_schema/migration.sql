-- CreateEnum
CREATE TYPE "Status" AS ENUM ('ACTIVE', 'HIDDEN', 'RETIRED');

-- CreateEnum
CREATE TYPE "PoolType" AS ENUM ('PT_IBT', 'YT_IBT');

-- CreateTable
CREATE TABLE "Network" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "explorerBaseUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Network_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" BIGSERIAL NOT NULL,
    "networkId" INTEGER NOT NULL,
    "ibtAddress" TEXT NOT NULL,
    "symbolDisplay" TEXT NOT NULL,
    "symbolCanonical" TEXT,
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "discoveredAt" TIMESTAMPTZ,
    "updatedAt" TIMESTAMPTZ,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Maturity" (
    "id" BIGSERIAL NOT NULL,
    "assetId" BIGINT NOT NULL,
    "maturityDate" DATE NOT NULL,
    "tenorMonths" INTEGER,
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Maturity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pool" (
    "id" BIGSERIAL NOT NULL,
    "maturityId" BIGINT NOT NULL,
    "poolType" "PoolType" NOT NULL,
    "poolAddress" TEXT NOT NULL,
    "feeRateBps" INTEGER,
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PtSnapshot" (
    "id" BIGSERIAL NOT NULL,
    "maturityId" BIGINT NOT NULL,
    "ts" TIMESTAMPTZ NOT NULL,
    "ptMarket" DECIMAL(38,18),
    "ptFair" DECIMAL(38,18),
    "ptMispricingPct" DECIMAL(9,6),
    "ptImpliedApy" DECIMAL(9,6),
    "bidAskSpread" DECIMAL(9,6),
    "vol24h" DECIMAL(24,6),
    "ingestSource" TEXT,
    "ingestVersion" TEXT,
    "raw" JSONB,

    CONSTRAINT "PtSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "YtSnapshot" (
    "id" BIGSERIAL NOT NULL,
    "maturityId" BIGINT NOT NULL,
    "ts" TIMESTAMPTZ NOT NULL,
    "ytPrice" DECIMAL(38,18),
    "ytImpliedApy" DECIMAL(9,6),
    "ytAccumulatedYield" DECIMAL(38,18),
    "dailyYieldEst" DECIMAL(38,18),
    "harvestSignal" INTEGER,
    "ingestSource" TEXT,
    "ingestVersion" TEXT,
    "raw" JSONB,

    CONSTRAINT "YtSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LpSnapshot" (
    "id" BIGSERIAL NOT NULL,
    "poolId" BIGINT NOT NULL,
    "ts" TIMESTAMPTZ NOT NULL,
    "tvl" DECIMAL(24,6),
    "vol24h" DECIMAL(24,6),
    "feeApr" DECIMAL(9,6),
    "utilization" DECIMAL(9,6),
    "ingestSource" TEXT,
    "ingestVersion" TEXT,
    "raw" JSONB,

    CONSTRAINT "LpSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InputMetric" (
    "id" BIGSERIAL NOT NULL,
    "ts" TIMESTAMPTZ NOT NULL,
    "metricKey" TEXT NOT NULL,
    "value" DECIMAL(24,8),
    "prevValue" DECIMAL(24,8),
    "changePct" DECIMAL(9,6),
    "threshold" DECIMAL(24,8),
    "status" INTEGER,
    "source" TEXT,
    "notes" TEXT,

    CONSTRAINT "InputMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioAsset" (
    "id" BIGSERIAL NOT NULL,
    "maturityId" BIGINT NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "addedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removedAt" TIMESTAMPTZ,

    CONSTRAINT "PortfolioAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioAllocation" (
    "id" BIGSERIAL NOT NULL,
    "maturityId" BIGINT NOT NULL,
    "ts" TIMESTAMPTZ NOT NULL,
    "targetWeightPct" DECIMAL(9,6),
    "effectiveWeightPct" DECIMAL(9,6),
    "policyTag" TEXT,

    CONSTRAINT "PortfolioAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioIntervalMetric" (
    "id" BIGSERIAL NOT NULL,
    "ts" TIMESTAMPTZ NOT NULL,
    "aumTotal" DECIMAL(24,6),
    "netApy" DECIMAL(9,6),
    "alpha" DECIMAL(9,6),
    "sharpe" DECIMAL(9,6),
    "alertsTotal" INTEGER,
    "byNetwork" JSONB,
    "byTenor" JSONB,

    CONSTRAINT "PortfolioIntervalMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioDailyMetric" (
    "id" BIGSERIAL NOT NULL,
    "date" DATE NOT NULL,
    "aumTotal" DECIMAL(24,6),
    "netApy" DECIMAL(9,6),
    "alpha" DECIMAL(9,6),
    "sharpe" DECIMAL(9,6),
    "alertsTotal" INTEGER,
    "notes" TEXT,

    CONSTRAINT "PortfolioDailyMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" BIGSERIAL NOT NULL,
    "ts" TIMESTAMPTZ NOT NULL,
    "entityType" INTEGER NOT NULL,
    "entityId" BIGINT NOT NULL,
    "severity" INTEGER NOT NULL,
    "alertType" TEXT NOT NULL,
    "message" TEXT,
    "data" JSONB,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Network_name_key" ON "Network"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_networkId_ibtAddress_key" ON "Asset"("networkId", "ibtAddress");

-- CreateIndex
CREATE UNIQUE INDEX "Maturity_assetId_maturityDate_key" ON "Maturity"("assetId", "maturityDate");

-- CreateIndex
CREATE UNIQUE INDEX "Pool_maturityId_poolType_key" ON "Pool"("maturityId", "poolType");

-- CreateIndex
CREATE INDEX "PtSnapshot_ts_idx" ON "PtSnapshot"("ts");

-- CreateIndex
CREATE UNIQUE INDEX "PtSnapshot_maturityId_ts_key" ON "PtSnapshot"("maturityId", "ts");

-- CreateIndex
CREATE INDEX "YtSnapshot_ts_idx" ON "YtSnapshot"("ts");

-- CreateIndex
CREATE UNIQUE INDEX "YtSnapshot_maturityId_ts_key" ON "YtSnapshot"("maturityId", "ts");

-- CreateIndex
CREATE INDEX "LpSnapshot_ts_idx" ON "LpSnapshot"("ts");

-- CreateIndex
CREATE UNIQUE INDEX "LpSnapshot_poolId_ts_key" ON "LpSnapshot"("poolId", "ts");

-- CreateIndex
CREATE INDEX "InputMetric_ts_idx" ON "InputMetric"("ts");

-- CreateIndex
CREATE UNIQUE INDEX "InputMetric_metricKey_ts_key" ON "InputMetric"("metricKey", "ts");

-- CreateIndex
CREATE INDEX "PortfolioAllocation_ts_idx" ON "PortfolioAllocation"("ts");

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioAllocation_maturityId_ts_key" ON "PortfolioAllocation"("maturityId", "ts");

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioIntervalMetric_ts_key" ON "PortfolioIntervalMetric"("ts");

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioDailyMetric_date_key" ON "PortfolioDailyMetric"("date");

-- CreateIndex
CREATE INDEX "Alert_ts_idx" ON "Alert"("ts");

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "Network"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Maturity" ADD CONSTRAINT "Maturity_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pool" ADD CONSTRAINT "Pool_maturityId_fkey" FOREIGN KEY ("maturityId") REFERENCES "Maturity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PtSnapshot" ADD CONSTRAINT "PtSnapshot_maturityId_fkey" FOREIGN KEY ("maturityId") REFERENCES "Maturity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "YtSnapshot" ADD CONSTRAINT "YtSnapshot_maturityId_fkey" FOREIGN KEY ("maturityId") REFERENCES "Maturity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LpSnapshot" ADD CONSTRAINT "LpSnapshot_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "Pool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioAsset" ADD CONSTRAINT "PortfolioAsset_maturityId_fkey" FOREIGN KEY ("maturityId") REFERENCES "Maturity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioAllocation" ADD CONSTRAINT "PortfolioAllocation_maturityId_fkey" FOREIGN KEY ("maturityId") REFERENCES "Maturity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

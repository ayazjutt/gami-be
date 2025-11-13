-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "apyThreshold" DECIMAL(38,18),
ADD COLUMN     "gasPriceGweiThreshold" DECIMAL(38,18),
ADD COLUMN     "liquidityDepthThreshold" DECIMAL(38,18),
ADD COLUMN     "pegStabilityThreshold" DECIMAL(38,18),
ADD COLUMN     "ptFairValueThreshold" DECIMAL(38,18),
ADD COLUMN     "ptPriceThreshold" DECIMAL(38,18),
ADD COLUMN     "ytAccumulatedThreshold" DECIMAL(38,18),
ADD COLUMN     "ytPriceThreshold" DECIMAL(38,18);

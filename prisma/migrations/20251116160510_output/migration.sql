-- CreateTable
CREATE TABLE "OutputSnapshot" (
    "id" SERIAL NOT NULL,
    "metric" TEXT NOT NULL,
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

-- CreateIndex
CREATE INDEX "OutputSnapshot_metric_createdAt_idx" ON "OutputSnapshot"("metric", "createdAt");

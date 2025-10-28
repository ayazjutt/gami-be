import { Injectable, Logger } from '@nestjs/common';
import { Prisma, OutputSnapshot } from '@prisma/client';
import {
  calcAlphaGeneration,
  calcAverageSlippage,
  calcDailyReturnsFromNav,
  calcGasEfficiency,
  calcHarvestFrequency,
  calcMaxDrawdown,
  calcNetApy,
  calcSharpeRatio,
  calcYieldEfficiency,
  computeDelta,
  deriveStatus,
  deriveTrend,
  MetricPolarity,
  NavPoint,
  PoolSnapshot,
  TradeExecutionLog,
} from './calculators';
import { PrismaService } from '../prisma/prisma.service';
import { loadOutputSettings, OutputSettings } from './settings';

interface HarvestLog {
  timestamp: Date;
  realizedUsd: number | null;
  gasCostUsd: number | null;
  gasUsed: number | null;
  gasPriceGwei: number | null;
}

interface TradeLog extends TradeExecutionLog {
  timestamp: Date;
}

export interface OutputSnapshotSummary {
  metric: string;
  currentValue: number | null;
  target: number | null;
  benchmark: number | null;
  vsTarget: number | null;
  vsBenchmark: number | null;
  status: string | null;
  trend: string | null;
  scope: {
    assetId: number | null;
    assetSymbol: string | null;
    tenure: string;
  };
  timestamp: string;
}

interface MetricComputation {
  title: string;
  value: number | null;
  target: number | null;
  benchmark: number | null;
  polarity: MetricPolarity;
  vsBenchmarkOverride?: number | null;
}

const NAV_LOOKBACK_DAYS = 60;
const HARVEST_LOOKBACK_DAYS = 30;
const TRADE_LOOKBACK_DAYS = 30;
const DEFAULT_WARNING_BAND = 0.1;
const YIELD_EFFICIENCY_TARGET = 100;

@Injectable()
export class OutputMetricsService {
  private readonly logger = new Logger(OutputMetricsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createOutputSnapshots(runAt = new Date()): Promise<void> {
    const settings = await loadOutputSettings(this.prisma);

    const metricMap = await this.loadMetricMap();
    if (!metricMap.size) {
      this.logger.warn('No OutputMetric entries found; skipping output snapshot creation.');
      return;
    }

    const pools = await this.getCurrentPools(runAt);
    const navHistory = await this.getNavHistory(NAV_LOOKBACK_DAYS, runAt);
    const harvestLogs = await this.getHarvestLogs(this.subtractDays(runAt, HARVEST_LOOKBACK_DAYS));
    const tradeLogs = await this.getTradeExecutionLogs(this.subtractDays(runAt, TRADE_LOOKBACK_DAYS));

    const netApy = calcNetApy(pools);
    const alpha = calcAlphaGeneration(netApy, settings.metaVaultApyBenchmark);
    const dailyReturns = calcDailyReturnsFromNav(navHistory);
    const sharpe = calcSharpeRatio(dailyReturns, settings.riskFreeRate);
    const maxDrawdown = calcMaxDrawdown(navHistory);

    const totalValueUsd = pools.reduce((acc, pool) => acc + pool.valueUsd, 0);
    const realizedYieldUsd = harvestLogs.reduce((acc, log) => acc + (log.realizedUsd ?? 0), 0);
    const totalGasCostUsd = harvestLogs.reduce((acc, log) => acc + (this.estimateGasCostUsd(log) ?? 0), 0);

    const targetYieldUsd = this.estimateTargetYieldUsd(totalValueUsd, settings.metaVaultApyTarget, HARVEST_LOOKBACK_DAYS);
    const yieldEfficiency = calcYieldEfficiency(
      realizedYieldUsd,
      targetYieldUsd,
    );
    const harvestFrequency = calcHarvestFrequency(harvestLogs.map((log) => ({ timestamp: log.timestamp })));
    const gasEfficiency = calcGasEfficiency(realizedYieldUsd, totalGasCostUsd > 0 ? totalGasCostUsd : null);
    const slippage = calcAverageSlippage(tradeLogs.map((trade) => ({ quotePrice: trade.quotePrice, executionPrice: trade.executionPrice })));

    const metrics: MetricComputation[] = [
      {
        title: 'MetaVault Net APY',
        value: netApy,
        target: settings.metaVaultApyTarget,
        benchmark: settings.metaVaultApyBenchmark,
        polarity: 'HIGHER_IS_BETTER',
      },
      {
        title: 'Alpha Generation',
        value: alpha,
        target: settings.alphaTarget,
        benchmark: settings.metaVaultApyBenchmark,
        polarity: 'HIGHER_IS_BETTER',
        vsBenchmarkOverride: netApy != null && settings.metaVaultApyBenchmark != null ? netApy - settings.metaVaultApyBenchmark : null,
      },
      {
        title: 'Sharpe Ratio',
        value: sharpe,
        target: settings.sharpeTarget,
        benchmark: settings.sharpeBenchmark,
        polarity: 'HIGHER_IS_BETTER',
      },
      {
        title: 'Maximum Drawdown',
        value: maxDrawdown,
        target: settings.maxDrawdownLimit,
        benchmark: settings.maxDrawdownBenchmark,
        polarity: 'HIGHER_IS_BETTER',
      },
      {
        title: 'Yield Efficiency',
        value: yieldEfficiency,
        target: YIELD_EFFICIENCY_TARGET,
        benchmark: settings.yieldEfficiencyBenchmark,
        polarity: 'HIGHER_IS_BETTER',
      },
      {
        title: 'Harvest Frequency',
        value: harvestFrequency,
        target: settings.harvestIntervalTargetDays,
        benchmark: null,
        polarity: 'LOWER_IS_BETTER',
      },
      {
        title: 'Gas Efficiency',
        value: gasEfficiency,
        target: settings.gasEfficiencyMinRatio,
        benchmark: null,
        polarity: 'HIGHER_IS_BETTER',
      },
      {
        title: 'Slippage Control',
        value: slippage,
        target: settings.slippageMaxPct,
        benchmark: null,
        polarity: 'LOWER_IS_BETTER',
      },
    ];

    const metricIds = metrics
      .map((metric) => metricMap.get(metric.title))
      .filter((value): value is number => typeof value === 'number');

    const previousSnapshots = await this.getPreviousSnapshots(metricIds, runAt);

    const payload: Prisma.OutputSnapshotCreateManyInput[] = [];

    for (const metric of metrics) {
      const metricId = metricMap.get(metric.title);
      if (!metricId) {
        this.logger.warn(`Missing OutputMetric entry for "${metric.title}"; skipping.`);
        continue;
      }

      const previous = previousSnapshots.get(metricId);
      const vsTarget = computeDelta(metric.value, metric.target, metric.polarity);
      const vsBenchmark =
        metric.vsBenchmarkOverride !== undefined
          ? metric.vsBenchmarkOverride
          : computeDelta(metric.value, metric.benchmark, metric.polarity);
      const status = deriveStatus(metric.value, metric.target, metric.polarity, DEFAULT_WARNING_BAND);
      const trend = deriveTrend(metric.value, previous?.currentValue ? Number(previous.currentValue) : null);

      payload.push({
        outputMetricId: metricId,
        currentValue: this.toDecimal(metric.value),
        target: this.toDecimal(metric.target),
        benchmark: this.toDecimal(metric.benchmark),
        vsTarget: this.toDecimal(vsTarget),
        vsBenchmark: this.toDecimal(vsBenchmark),
        status,
        trend,
        createdAt: runAt,
      });
    }

    if (!payload.length) {
      this.logger.warn('No output snapshots computed; nothing to persist.');
      return;
    }

    await this.prisma.outputSnapshot.createMany({
      data: payload,
    });

    this.logger.log(`Created ${payload.length} MetaVault output snapshots.`);
  }

  async getAllOutputSnapshots(): Promise<OutputSnapshotSummary[]> {
    const rows = await this.prisma.outputSnapshot.findMany({
      include: {
        outputMetric: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return rows.map((row: any) => {
      return {
        metric: row.outputMetric?.title ?? 'Unknown Metric',
        currentValue: this.fromDecimal(row.currentValue),
        target: this.fromDecimal(row.target),
        benchmark: this.fromDecimal(row.benchmark),
        vsTarget: this.fromDecimal(row.vsTarget),
        vsBenchmark: this.fromDecimal(row.vsBenchmark),
        status: row.status ?? null,
        trend: this.formatTrend(row.trend),
        scope: {
          assetId: null,
          assetSymbol: null,
          tenure: 'ALL',
        },
        timestamp: row.createdAt.toISOString(),
      } satisfies OutputSnapshotSummary;
    });
  }

  private async resolveMetaVaultSnapshotId(settings: OutputSettings): Promise<number | null> {
    if (settings.metaVaultMaturitySnapshotId) {
      return settings.metaVaultMaturitySnapshotId;
    }

    const snapshot = await this.prisma.maturitySnapshot.findFirst({
      where: {
        OR: [
          { name: { equals: 'MetaVault', mode: 'insensitive' } },
          { symbol: { equals: 'MetaVault', mode: 'insensitive' } },
        ],
      },
      orderBy: { id: 'desc' },
    });

    return snapshot?.id ?? null;
  }

  private async loadMetricMap(): Promise<Map<string, number>> {
    const metrics = await this.prisma.outputMetric.findMany();
    const map = new Map<string, number>();
    metrics.forEach((metric) => map.set(metric.title, metric.id));
    return map;
  }

  private async getPreviousSnapshots(
    metricIds: number[],
    runAt: Date,
  ): Promise<Map<number, OutputSnapshot>> {
    if (!metricIds.length) {
      return new Map();
    }

    const rows = await this.prisma.outputSnapshot.findMany({
      where: {
        outputMetricId: { in: metricIds },
        createdAt: { lt: runAt },
      },
      orderBy: { createdAt: 'desc' },
    });

    const result = new Map<number, OutputSnapshot>();
    for (const row of rows) {
      if (!result.has(row.outputMetricId)) {
        result.set(row.outputMetricId, row);
      }
    }

    return result;
  }

  private async getCurrentPools(runAt: Date): Promise<PoolSnapshot[]> {
    const lookback = this.subtractDays(runAt, 2);
    const rows = await this.prisma.lPPoolsSnapshot.findMany({
      where: {
        createdAt: { gte: lookback },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    const byPool = new Map<string, PoolSnapshot>();
    for (const row of rows) {
      const poolKey = row.pool ?? `${row.tenureId ?? 'unknown'}:${row.id}`;
      if (byPool.has(poolKey)) {
        continue;
      }

      const apy = row.apy ? Number(row.apy) : null;
      const value = row.ourAllocation ?? row.tvl;
      const valueUsd = value ? Number(value) : 0;

      if (apy == null || !Number.isFinite(apy) || !Number.isFinite(valueUsd) || valueUsd <= 0) {
        continue;
      }

      byPool.set(poolKey, { apy, valueUsd });
    }

    return Array.from(byPool.values());
  }

  private async getNavHistory(days: number, runAt: Date): Promise<NavPoint[]> {
    const since = this.subtractDays(runAt, days);
    const snapshots = await this.prisma.spectraSnapshot.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: 'asc' },
    });

    const byDate = new Map<string, number>();
    for (const snapshot of snapshots) {
      if (!snapshot.createdAt || !snapshot.usdValue) {
        continue;
      }

      const key = snapshot.createdAt.toISOString().slice(0, 10);
      const value = Number(snapshot.usdValue);
      if (!Number.isFinite(value)) {
        continue;
      }

      byDate.set(key, (byDate.get(key) ?? 0) + value);
    }

    return Array.from(byDate.entries())
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([key, value]) => ({ date: new Date(`${key}T00:00:00Z`), nav: value }));
  }

  private async getHarvestLogs(since: Date): Promise<HarvestLog[]> {
    // TODO: Replace with actual harvest log query once the table is available.
    void since;
    return [];
  }

  private async getTradeExecutionLogs(since: Date): Promise<TradeLog[]> {
    // TODO: Replace with actual trade execution log query once the table is available.
    void since;
    return [];
  }

  private subtractDays(reference: Date, days: number): Date {
    const result = new Date(reference);
    result.setUTCDate(result.getUTCDate() - days);
    return result;
  }

  private estimateTargetYieldUsd(totalValueUsd: number, targetApy: number | null, lookbackDays: number): number | null {
    if (!Number.isFinite(totalValueUsd) || totalValueUsd <= 0 || targetApy == null) {
      return null;
    }

    return totalValueUsd * targetApy * (lookbackDays / 365);
  }

  private estimateGasCostUsd(log: HarvestLog): number | null {
    if (log.gasCostUsd != null) {
      return log.gasCostUsd;
    }

    // TODO: Convert gas usage and gas price to USD once pricing data is available.
    return null;
  }

  private toDecimal(value: number | null): Prisma.Decimal | null {
    if (value == null || !Number.isFinite(value)) {
      return null;
    }

    return new Prisma.Decimal(value);
  }

  private fromDecimal(value: Prisma.Decimal | null): number | null {
    if (value == null) {
      return null;
    }

    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }

  private formatTrend(trend: string | null): string | null {
    if (!trend) {
      return null;
    }

    const normalized = trend.trim();
    if (!normalized.length) {
      return null;
    }

    const lower = normalized.toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }

  // New simple snapshot creator as requested
  // Steps:
  // 1) Load settings (target/benchmark)
  // 2) Get all assets where isRemoved=false and their latest maturity snapshot
  // 3) Compute MetaVault Net APY across assets using pools[0] ptPrice.usd and ptApy
  // 4) Persist OutputSnapshot for 'MetaVault Net APY' only (no maturitySnapshot link)
  async createOutputSnapshot1(runAt = new Date()): Promise<void> {
    // Loop metrics; keep each metric's computation inside its branch
    const metrics = await this.prisma.outputMetric.findMany();
    for (const metric of metrics) {
      if (metric.title === 'MetaVault Net APY') {
       await this.processNetApy(runAt, metric);
      }
    }
  }

  async processNetApy(runAt, metric) {
    // Settings needed for MetaVault Net APY
      const settingKeys = [
        'MetaVault Net APY Target',
        'MetaVault Net APY Benchmark',
        'metavault.apy.target',
        'metavault.apy.benchmark',
      ];
      const settingRows = await this.prisma.setting.findMany({ where: { key: { in: settingKeys } } });
      const settingsMap = new Map(settingRows.map((s) => [s.key, s] as const));
      const parseNum = (k: string): number | null => {
        const s = settingsMap.get(k);
        if (!s) return null;
        if (s.numValue != null) return Number(s.numValue as any);
        if (s.value != null) {
          const n = Number(s.value);
          return Number.isFinite(n) ? n : null;
        }
        return null;
      };
      const target = parseNum('MetaVault Net APY Target') ?? parseNum('metavault.apy.target');
      const benchmark = parseNum('MetaVault Net APY Benchmark') ?? parseNum('metavault.apy.benchmark');

      // Fetch all maturities (all assets) for calculation
      const maturities = await this.prisma.maturitySnapshot.findMany({
        where: { asset: { isRemoved: false } },
        include: { asset: true },
        orderBy: { createdAt: 'desc' },
      });

      // Calculate Net APY
      let sumWeighted = 0;
      let sumPosition = 0;
      for (const snap of maturities) {
        const balNum = snap.balance != null ? Number(snap.balance as any) : 0;
        const balance = Number.isFinite(balNum) ? balNum : 0;

        const pools: any[] = Array.isArray((snap as any).pools) ? ((snap as any).pools as any[]) : [];
        const p0 = pools[0] ?? null;
        const ptPriceUsd = p0?.ptPrice?.usd != null ? Number(p0.ptPrice.usd) : null;
        let ptApy = p0?.ptApy != null ? Number(p0.ptApy) : null;
        if (ptPriceUsd == null || ptApy == null) continue;

        // Normalize APY to decimal if provided in % (e.g., 8.24 -> 0.0824)
        if (ptApy > 1) {
          ptApy = ptApy / 100;
        }

        const positionValue = (balance / 1e18) * ptPriceUsd;
        if (!Number.isFinite(positionValue) || positionValue <= 0) continue;

        const weighted = positionValue * ptApy;
        sumPosition += positionValue;
        sumWeighted += weighted;
      }

      const currentValue = sumPosition > 0 ? sumWeighted / sumPosition : null;
      const vsTarget = currentValue != null && target != null ? currentValue - target : null;
      const vsBenchmark = currentValue != null && benchmark != null ? currentValue - benchmark : null;
      const status = vsTarget != null ? (vsTarget > 0 ? '✅' : '❌') : null;
      const trend = '↗️';

      if (currentValue != null) {
        const netApyPct = (currentValue * 100).toFixed(2);
        const aumStr = sumPosition.toLocaleString(undefined, { maximumFractionDigits: 2 });
        this.logger.log(`MetaVault Net APY ≈ ${netApyPct}% | Total AUM ≈ $${aumStr} USD`);
      } else {
        this.logger.warn('MetaVault Net APY could not be computed (insufficient data).');
      }

      await this.prisma.outputSnapshot.create({
        data: {
          outputMetricId: metric.id,
          currentValue: currentValue != null ? new Prisma.Decimal(currentValue) : null,
          target: target != null ? new Prisma.Decimal(target) : null,
          benchmark: benchmark != null ? new Prisma.Decimal(benchmark) : null,
          vsTarget: vsTarget != null ? new Prisma.Decimal(vsTarget) : null,
          vsBenchmark: vsBenchmark != null ? new Prisma.Decimal(vsBenchmark) : null,
          status,
          trend,
          createdAt: runAt,
        },
      });

      this.logger.log('createOutputSnapshot1: MetaVault Net APY snapshot created.');
  }
}

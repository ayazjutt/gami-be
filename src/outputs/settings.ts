import { Prisma, Setting } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface OutputSettings {
  metaVaultApyTarget: number | null;
  metaVaultApyBenchmark: number | null;
  alphaTarget: number | null;
  riskFreeRate: number | null;
  sharpeTarget: number | null;
  sharpeBenchmark: number | null;
  maxDrawdownLimit: number | null;
  maxDrawdownBenchmark: number | null;
  harvestIntervalTargetDays: number | null;
  gasEfficiencyMinRatio: number | null;
  slippageMaxPct: number | null;
  yieldEfficiencyBenchmark: number | null;
  metaVaultMaturitySnapshotId: number | null;
}

const NUMERIC_KEYS: Record<keyof OutputSettings, string> = {
  metaVaultApyTarget: 'metavault.apy.target',
  metaVaultApyBenchmark: 'metavault.apy.benchmark',
  alphaTarget: 'metavault.alpha.target_bps',
  riskFreeRate: 'riskfree.rate',
  sharpeTarget: 'metavault.sharpe.target',
  sharpeBenchmark: 'metavault.sharpe.benchmark',
  maxDrawdownLimit: 'metavault.maxdd.limit_pct',
  maxDrawdownBenchmark: 'metavault.maxdd.benchmark_pct',
  harvestIntervalTargetDays: 'harvest.interval.target_days',
  gasEfficiencyMinRatio: 'gas.efficiency.min_ratio',
  slippageMaxPct: 'slippage.max_pct',
  yieldEfficiencyBenchmark: 'metavault.yield.benchmark_pct',
  metaVaultMaturitySnapshotId: 'metavault.maturity_snapshot_id',
};

export async function loadOutputSettings(prisma: PrismaService): Promise<OutputSettings> {
  const keys = Object.values(NUMERIC_KEYS);
  const settings = await prisma.setting.findMany({
    where: { key: { in: keys } },
  });

  const map = new Map<string, Setting>();
  for (const setting of settings) {
    map.set(setting.key, setting);
  }

  const result = {} as OutputSettings;
  for (const [prop, key] of Object.entries(NUMERIC_KEYS) as [keyof OutputSettings, string][]) {
    result[prop] = parseSettingNumber(map.get(key));
  }

  // Convert alpha target from basis points to decimal if present.
  if (result.alphaTarget != null) {
    result.alphaTarget = result.alphaTarget / 10_000;
  }

  return result;
}

function parseSettingNumber(setting: Setting | undefined): number | null {
  if (!setting) {
    return null;
  }

  if (setting.numValue != null) {
    return new Prisma.Decimal(setting.numValue).toNumber();
  }

  if (setting.value != null) {
    const parsed = Number(setting.value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

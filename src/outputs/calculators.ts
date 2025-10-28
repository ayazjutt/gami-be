import { strict as assert } from 'assert';

export interface PoolSnapshot {
  apy: number;
  valueUsd: number;
}

export interface NavPoint {
  date: Date;
  nav: number;
}

export interface HarvestLogSummary {
  timestamp: Date;
}

export interface TradeExecutionLog {
  quotePrice: number;
  executionPrice: number;
}

export type MetricPolarity = 'HIGHER_IS_BETTER' | 'LOWER_IS_BETTER';

export function calcNetApy(pools: PoolSnapshot[]): number | null {
  if (!pools.length) {
    return null;
  }

  let weightedReturn = 0;
  let totalValue = 0;

  for (const pool of pools) {
    if (!isFinite(pool.apy) || !isFinite(pool.valueUsd) || pool.valueUsd <= 0) {
      continue;
    }

    weightedReturn += pool.apy * pool.valueUsd;
    totalValue += pool.valueUsd;
  }

  if (totalValue === 0) {
    return null;
  }

  return weightedReturn / totalValue;
}

export function calcAlphaGeneration(netApy: number | null, benchmarkApy: number | null): number | null {
  if (netApy == null || benchmarkApy == null) {
    return null;
  }

  return netApy - benchmarkApy;
}

export function calcDailyReturnsFromNav(navPoints: NavPoint[]): number[] {
  if (navPoints.length < 2) {
    return [];
  }

  const sorted = [...navPoints].sort((a, b) => a.date.getTime() - b.date.getTime());
  const returns: number[] = [];

  for (let i = 1; i < sorted.length; i += 1) {
    const previous = sorted[i - 1];
    const current = sorted[i];
    if (previous.nav <= 0 || current.nav <= 0) {
      continue;
    }

    const dailyReturn = (current.nav - previous.nav) / previous.nav;
    if (isFinite(dailyReturn)) {
      returns.push(dailyReturn);
    }
  }

  return returns;
}

export function calcSharpeRatio(dailyReturns: number[], riskFreeRate: number | null): number | null {
  if (dailyReturns.length < 2) {
    return null;
  }

  const rfDaily = riskFreeRate != null ? riskFreeRate / 365 : 0;
  const excessReturns = dailyReturns
    .map((value) => value - rfDaily)
    .filter((value) => Number.isFinite(value));

  if (excessReturns.length < 2) {
    return null;
  }

  const mean = excessReturns.reduce((acc, value) => acc + value, 0) / excessReturns.length;
  let variance = 0;
  for (const value of excessReturns) {
    variance += (value - mean) ** 2;
  }

  variance /= excessReturns.length - 1;
  if (variance <= 0) {
    return null;
  }

  const stdDev = Math.sqrt(variance);
  if (!Number.isFinite(stdDev) || stdDev === 0) {
    return null;
  }

  const sharpe = (mean / stdDev) * Math.sqrt(365);
  return Number.isFinite(sharpe) ? sharpe : null;
}

export function calcMaxDrawdown(navPoints: NavPoint[]): number | null {
  if (navPoints.length === 0) {
    return null;
  }

  const sorted = [...navPoints].sort((a, b) => a.date.getTime() - b.date.getTime());
  let peak = sorted[0].nav;
  let maxDrawdown = 0;

  for (const point of sorted) {
    if (point.nav > peak) {
      peak = point.nav;
    }

    if (peak <= 0) {
      continue;
    }

    const drawdown = (point.nav - peak) / peak;
    if (drawdown < maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }

  return maxDrawdown;
}

export function calcYieldEfficiency(realizedYieldUsd: number | null, targetYieldUsd: number | null): number | null {
  if (realizedYieldUsd == null || targetYieldUsd == null || targetYieldUsd <= 0) {
    return null;
  }

  const ratio = (realizedYieldUsd / targetYieldUsd) * 100;
  return Number.isFinite(ratio) ? ratio : null;
}

export function calcHarvestFrequency(harvests: HarvestLogSummary[]): number | null {
  if (harvests.length < 2) {
    return null;
  }

  const sorted = [...harvests].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  const intervals: number[] = [];

  for (let i = 1; i < sorted.length; i += 1) {
    const diffMs = sorted[i].timestamp.getTime() - sorted[i - 1].timestamp.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    if (Number.isFinite(diffDays) && diffDays >= 0) {
      intervals.push(diffDays);
    }
  }

  if (!intervals.length) {
    return null;
  }

  const sum = intervals.reduce((acc, value) => acc + value, 0);
  return sum / intervals.length;
}

export function calcGasEfficiency(totalYieldUsd: number | null, totalGasCostUsd: number | null): number | null {
  if (totalYieldUsd == null || totalGasCostUsd == null || totalGasCostUsd <= 0) {
    return null;
  }

  const ratio = totalYieldUsd / totalGasCostUsd;
  return Number.isFinite(ratio) ? ratio : null;
}

export function calcAverageSlippage(trades: TradeExecutionLog[]): number | null {
  if (!trades.length) {
    return null;
  }

  const slippages: number[] = [];

  for (const trade of trades) {
    if (trade.quotePrice <= 0) {
      continue;
    }

    const diffPct = Math.abs(trade.executionPrice - trade.quotePrice) / trade.quotePrice * 100;
    if (Number.isFinite(diffPct)) {
      slippages.push(diffPct);
    }
  }

  if (!slippages.length) {
    return null;
  }

  const total = slippages.reduce((acc, value) => acc + value, 0);
  return total / slippages.length;
}

export function computeDelta(
  current: number | null,
  reference: number | null,
  polarity: MetricPolarity,
): number | null {
  if (current == null || reference == null) {
    return null;
  }

  const rawDelta = current - reference;
  return polarity === 'HIGHER_IS_BETTER' ? rawDelta : -rawDelta;
}

export function deriveStatus(
  current: number | null,
  target: number | null,
  polarity: MetricPolarity,
  warningBand = 0.1,
): 'OK' | 'WARNING' | 'CRITICAL' {
  if (current == null || target == null) {
    return 'WARNING';
  }

  if (polarity === 'HIGHER_IS_BETTER') {
    if (current >= target) {
      return 'OK';
    }

    const threshold = target * (1 - warningBand);
    return current >= threshold ? 'WARNING' : 'CRITICAL';
  }

  assert(polarity === 'LOWER_IS_BETTER');

  if (current <= target) {
    return 'OK';
  }

  const threshold = target * (1 + warningBand);
  return current <= threshold ? 'WARNING' : 'CRITICAL';
}

export function deriveTrend(
  current: number | null,
  previous: number | null,
  epsilon = 1e-6,
): 'UP' | 'DOWN' | 'FLAT' {
  if (current == null || previous == null) {
    return 'FLAT';
  }

  const delta = current - previous;
  if (Math.abs(delta) <= epsilon) {
    return 'FLAT';
  }

  return delta > 0 ? 'UP' : 'DOWN';
}

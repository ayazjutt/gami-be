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
} from '../outputs/calculators';

describe('output calculators', () => {
  it('calculates weighted net APY', () => {
    const result = calcNetApy([
      { apy: 0.1, valueUsd: 1_000 },
      { apy: 0.2, valueUsd: 2_000 },
    ]);

    expect(result).toBeCloseTo(0.1666666, 4);
  });

  it('computes alpha generation', () => {
    expect(calcAlphaGeneration(0.15, 0.12)).toBeCloseTo(0.03, 6);
  });

  it('converts NAV history into daily returns', () => {
    const returns = calcDailyReturnsFromNav([
      { date: new Date('2024-01-01'), nav: 100 },
      { date: new Date('2024-01-02'), nav: 102 },
      { date: new Date('2024-01-03'), nav: 101 },
    ]);

    expect(returns).toHaveLength(2);
    expect(returns[0]).toBeCloseTo(0.02, 6);
    expect(returns[1]).toBeCloseTo(-0.009803, 4);
  });

  it('calculates sharpe ratio', () => {
    const sharpe = calcSharpeRatio([0.01, 0.02, -0.01, 0.015], 0.05);
    expect(sharpe).not.toBeNull();
    expect(sharpe ?? 0).toBeCloseTo(12.51, 2);
  });

  it('computes maximum drawdown', () => {
    const drawdown = calcMaxDrawdown([
      { date: new Date('2024-01-01'), nav: 100 },
      { date: new Date('2024-01-02'), nav: 120 },
      { date: new Date('2024-01-03'), nav: 90 },
      { date: new Date('2024-01-04'), nav: 110 },
    ]);

    expect(drawdown).toBeCloseTo(-0.25, 6);
  });

  it('calculates yield efficiency', () => {
    const efficiency = calcYieldEfficiency(150, 100);
    expect(efficiency).toBeCloseTo(150, 6);
  });

  it('calculates harvest frequency', () => {
    const frequency = calcHarvestFrequency([
      { timestamp: new Date('2024-01-01T00:00:00Z') },
      { timestamp: new Date('2024-01-06T00:00:00Z') },
      { timestamp: new Date('2024-01-12T00:00:00Z') },
    ]);

    expect(frequency).toBeCloseTo(5.5, 6);
  });

  it('calculates gas efficiency', () => {
    expect(calcGasEfficiency(100, 10)).toBeCloseTo(10, 6);
  });

  it('calculates average slippage', () => {
    const slippage = calcAverageSlippage([
      { quotePrice: 100, executionPrice: 101 },
      { quotePrice: 200, executionPrice: 198 },
    ]);

    expect(slippage).toBeCloseTo(1, 6);
  });

  it('derives deltas and status', () => {
    expect(computeDelta(0.12, 0.1, 'HIGHER_IS_BETTER')).toBeCloseTo(0.02, 6);
    expect(computeDelta(0.1, 0.2, 'LOWER_IS_BETTER')).toBeCloseTo(0.1, 6);
    expect(deriveStatus(0.12, 0.1, 'HIGHER_IS_BETTER')).toBe('OK');
    expect(deriveStatus(0.095, 0.1, 'HIGHER_IS_BETTER')).toBe('WARNING');
    expect(deriveStatus(0.2, 0.1, 'LOWER_IS_BETTER')).toBe('CRITICAL');
  });

  it('derives trend from previous value', () => {
    expect(deriveTrend(0.11, 0.1)).toBe('UP');
    expect(deriveTrend(0.09, 0.1)).toBe('DOWN');
    expect(deriveTrend(0.1, 0.1000000001)).toBe('FLAT');
  });
});

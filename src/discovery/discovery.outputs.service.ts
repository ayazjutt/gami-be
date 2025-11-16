import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DiscoveryMaturityService } from './discovery.maturity.service';

type OutputMetric = { slug: string; title: string };

@Injectable()
export class DiscoveryOutputsService {
  private readonly logger = new Logger(DiscoveryOutputsService.name);

  // Mapping of output snapshot metrics
  readonly outputSnapshotMetrics: OutputMetric[] = [
    { slug: 'metavault_net_apy', title: 'MetaVault Net APY' },
    { slug: 'alpha_generation', title: 'Alpha Generation' },
    { slug: 'sharpe_ratio', title: 'Sharpe Ratio' },
    { slug: 'maximum_drawdown', title: 'Maximum Drawdown' },
    { slug: 'yield_efficiency', title: 'Yield Efficiency' },
    { slug: 'harvest_frequency', title: 'Harvest Frequency' },
    { slug: 'gas_efficiency', title: 'Gas Efficiency' },
    { slug: 'slippage_control', title: 'Slippage Control' },
  ];

  constructor(
    @Inject(forwardRef(() => DiscoveryMaturityService))
    private readonly maturity: DiscoveryMaturityService,
    private readonly prisma: PrismaService,
  ) {}

  async calc() {
    const maturities = await this.maturity.getLatestMaturities();
    this.logger.log(`Outputs: fetched ${maturities.length} maturities`);

    await this.computeAndSaveMetaVaultNetApy(maturities);
    await this.computeAndSaveAlphaGeneration(maturities);
    await this.computeAndSaveSharpeRatio(maturities);
    await this.computeAndSaveMaximumDrawdown(maturities);
    await this.computeAndSaveYieldEfficiency(maturities);
    await this.computeAndSaveHarvestFrequency(maturities);
    await this.computeAndSaveGasEfficiency(maturities);
    await this.computeAndSaveSlippageControl(maturities);

    return maturities;
  }

  private toNum(v: unknown): number | null {
    if (v == null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  private async upsertOutput(
    metric: string,
    values: {
      currentValue?: number | null;
      target?: number | null;
      benchmark?: number | null;
      vsTarget?: number | null;
      vsBenchmark?: number | null;
      status?: string | null;
      trend?: string | null;
    },
  ) {
    
    const toStr = (n: number | null | undefined) => (n == null ? null : String(n));
    await (this.prisma as any).outputSnapshot.create({
      data: {
        metric,
        currentValue: toStr(values.currentValue ?? null),
        target: toStr(values.target ?? null),
        benchmark: toStr(values.benchmark ?? null),
        vsTarget: toStr(values.vsTarget ?? null),
        vsBenchmark: toStr(values.vsBenchmark ?? null),
        status: values.status ?? null,
        trend: values.trend ?? null,
      },
    });
  }

  private async getTargetBenchmark(settingBase: string) {
    const keys = [`${settingBase} Target`, `${settingBase} Benchmark`];
    const rows = await this.prisma.setting.findMany({ where: { key: { in: keys } } });
    const numOrNull = (v: unknown) => this.toNum(v);
    const findVal = (k: string) => {
      const r = rows.find((x) => x.key === k) as any;
      return numOrNull(r?.numValue ?? r?.value);
    };
    return {
      target: findVal(`${settingBase} Target`),
      benchmark: findVal(`${settingBase} Benchmark`),
    } as const;
  }

  private snapshotsOf(m: any) {
    const inputs = Array.isArray(m?.maturity?.inputSnapshot) ? m.maturity.inputSnapshot : [];
    const findInput = (key: string) => inputs.find((x: any) => x?.metric === key);
    const pt = Array.isArray(m?.maturity?.ptTracking) ? m.maturity.ptTracking[0] : null;
    const yt = Array.isArray(m?.maturity?.ytTracking) ? m.maturity.ytTracking[0] : null;
    return { inputs, findInput, pt, yt } as const;
  }

  private async computeAndSaveMetaVaultNetApy(maturities: any[]) {
    // Net APY = Σ(Position Value × APY) / Total AUM across all assets
    let weightedSum = 0;
    let totalAum = 0;
    for (const m of maturities) {
      const asset = (m?.maturity?.payload ?? null) as any;
      const pools = Array.isArray(asset?.pools) ? asset.pools : [];
      const impliedApyPct = this.toNum(pools?.[0]?.impliedApy);
      const apyDecimal = impliedApyPct != null ? impliedApyPct / 100 : null;
      const decimals = this.toNum(asset?.decimals) ?? 0;
      const balanceRaw = this.toNum(asset?.balance) ?? 0;
      const scale = decimals > 0 ? Math.pow(10, decimals) : 1;
      const balancePT = scale !== 0 ? balanceRaw / scale : 0;
      const ptPriceUsd = this.toNum(pools?.[0]?.ptPrice?.usd);
      const allocation = ptPriceUsd != null ? balancePT * ptPriceUsd : null;
      if (apyDecimal != null && allocation != null && allocation > 0) {
        weightedSum += allocation * apyDecimal;
        totalAum += allocation;
      }
    }
    const currentValue = totalAum > 0 ? weightedSum / totalAum : null;

    // Fetch target and benchmark from settings
    const settings = await this.prisma.setting.findMany({
      where: { key: { in: ['MetaVault Net APY Target', 'MetaVault Net APY Benchmark'] } },
    });
    const getNum = (k: string): number | null => {
      const item = settings.find((s) => s.key === k);
      return this.toNum((item as any)?.numValue ?? (item as any)?.value);
    };
    const target = getNum('MetaVault Net APY Target');
    const benchmark = getNum('MetaVault Net APY Benchmark');

    const vsTarget = target != null && currentValue != null ? currentValue - target : null;
    const vsBenchmark = benchmark != null && currentValue != null ? currentValue - benchmark : null;
    const status = vsTarget != null && vsTarget > 0 ? '✅' : '❌';
    const trend = '↗️';

    await this.upsertOutput('metavault_net_apy', {
      currentValue,
      target,
      benchmark,
      vsTarget,
      vsBenchmark,
      status,
      trend,
    });
  }

  private async computeAndSaveAlphaGeneration(maturities: any[]) {
    // Alpha Generation = MetaVault Net APY − Risk-Free Rate
    const { target, benchmark } = await this.getTargetBenchmark('Alpha Generation');
    // Net APY previously computed and stored (global)
    const netApyRow = await (this.prisma as any).outputSnapshot.findFirst({
      where: { metric: 'metavault_net_apy' },
      orderBy: { createdAt: 'desc' },
    });
    const netApy = this.toNum(netApyRow?.currentValue);

    // Benchmark fallback to a dedicated Risk-Free Rate setting if available
    let rf = benchmark;
    if (rf == null) {
      const riskFree = await this.prisma.setting.findUnique({ where: { key: 'Risk-Free Rate' } as any });
      rf = this.toNum((riskFree as any)?.numValue ?? (riskFree as any)?.value);
    }

    const currentValue = netApy != null && rf != null ? netApy - rf : null;
    const vsTarget = target != null && currentValue != null ? currentValue - target : null;
    const vsBenchmark = rf != null && currentValue != null ? currentValue - rf : null;
    const status = vsTarget != null && vsTarget > 0 ? '✅' : '❌';
    const trend = '↗️';

    await this.upsertOutput('alpha_generation', {
      currentValue,
      target,
      benchmark: rf,
      vsTarget,
      vsBenchmark,
      status,
      trend,
    });
  }

  private async computeAndSaveSharpeRatio(maturities: any[]) {
    const { target, benchmark } = await this.getTargetBenchmark('Sharpe Ratio');
    const currentValue = 0;
    const vsTarget = target != null ? currentValue - target : null;
    const vsBenchmark = benchmark != null ? currentValue - benchmark : null;
    const status = vsTarget != null && vsTarget > 0 ? '✅' : '❌';
    const trend = '↗️';

    await this.upsertOutput('sharpe_ratio', {
      currentValue,
      target,
      benchmark,
      vsTarget,
      vsBenchmark,
      status,
      trend,
    });
  }

    private async computeAndSaveMaximumDrawdown(maturities: any[]) {
    const { target, benchmark } = await this.getTargetBenchmark('Maximum Drawdown');

    // Efficient NAV history from DB (minimal columns)
    const rows = await (this.prisma as any).maturitySnapshot.findMany({
      select: { createdAt: true, payload: true },
      orderBy: { createdAt: 'asc' },
    });

    const toNum = (v: any): number | null => {
      if (v == null) return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };

    const navByTs = new Map<number, number>();
    for (const r of rows) {
      const ts = new Date(r.createdAt as any).getTime();
      const payload: any = (r as any)?.payload ?? null;
      const assets: any[] = Array.isArray(payload) ? payload : (payload ? [payload] : []);

      let nav = 0;
      for (const asset of assets) {
        const pools = Array.isArray(asset?.pools) ? asset.pools : [];

        // PT
        const ptPriceUsd = toNum(pools?.[0]?.ptPrice?.usd);
        const ptBalRaw = toNum(asset?.balance);
        const ptDecimals = toNum(asset?.decimals) ?? 0;
        const ptBal = ptBalRaw != null ? (ptDecimals > 0 ? ptBalRaw / Math.pow(10, ptDecimals) : ptBalRaw) : 0;
        if (ptPriceUsd != null && ptBal != null) nav += ptBal * ptPriceUsd;

        // YT
        const ytBalRaw = toNum(asset?.yt?.balance);
        const ytDecimals = toNum(asset?.yt?.decimals) ?? 0;
        const ytBal = ytBalRaw != null ? (ytDecimals > 0 ? ytBalRaw / Math.pow(10, ytDecimals) : ytBalRaw) : 0;
        const ytPriceUsd = toNum(pools?.[0]?.ytPrice?.usd);
        if (ytPriceUsd != null && ytBal != null) nav += ytBal * ytPriceUsd;

        // LP
        const lpSupplyOwned = toNum(asset?.lp?.supplyOwned ?? asset?.lpt?.supplyOwned ?? asset?.pools?.[0]?.lpt?.supplyOwned);
        const lpPriceUsd = toNum(asset?.lp?.price?.usd ?? asset?.lpt?.price?.usd ?? asset?.pools?.[0]?.lpt?.price?.usd);
        if (lpSupplyOwned != null && lpPriceUsd != null) nav += lpSupplyOwned * lpPriceUsd;
      }

      // If payload already contains the full portfolio array, keep only first entry per timestamp
      if (Array.isArray(payload) && payload.length > 1) {
        if (!navByTs.has(ts)) navByTs.set(ts, nav);
      } else {
        navByTs.set(ts, (navByTs.get(ts) ?? 0) + nav);
      }
    }

    const navHistory = Array.from(navByTs.entries())
      .map(([ts, nav]) => ({ ts, nav }))
      .sort((a, b) => a.ts - b.ts);

    let peak = -Infinity;
    let mdd = 0;
    for (const p of navHistory) {
      if (p.nav > peak) peak = p.nav;
      const dd = peak > 0 ? (p.nav - peak) / peak : 0;
      if (dd < mdd) mdd = dd;
    }

    const currentValue = navHistory.length > 0 ? Math.abs(mdd) * 100 : null;
    const vsTarget = target != null && currentValue != null ? currentValue - target : null;
    const vsBenchmark = benchmark != null && currentValue != null ? currentValue - benchmark : null;
     const status = vsTarget != null && vsTarget > 0 ? '✅' : '❌';
    const trend = '↗️';
    console.log("maximum_drawdown", currentValue)

    await this.upsertOutput('maximum_drawdown', {
      currentValue,
      target,
      benchmark,
      vsTarget,
      vsBenchmark,
      status,
      trend,
    });
  }
  private async computeAndSaveYieldEfficiency(maturities: any[]) {
    const { target, benchmark } = await this.getTargetBenchmark('Yield Efficiency');
    const currentValue = 0;
    const vsTarget = target != null ? currentValue - target : null;
    const vsBenchmark = benchmark != null ? currentValue - benchmark : null;
    const status = vsTarget != null && vsTarget > 0 ? '✅' : '❌';
    const trend = '↗️';

    await this.upsertOutput('yield_efficiency', {
      currentValue,
      target,
      benchmark,
      vsTarget,
      vsBenchmark,
      status,
      trend,
    });
  }

  private async computeAndSaveHarvestFrequency(maturities: any[]) {
    const { target, benchmark } = await this.getTargetBenchmark('Harvest Frequency');
    const currentValue = 0;
    const vsTarget = target != null ? currentValue - target : null;
    const vsBenchmark = benchmark != null ? currentValue - benchmark : null;
    const status = vsTarget != null && vsTarget > 0 ? '✅' : '❌';
    const trend = '↗️';

    await this.upsertOutput('harvest_frequency', {
      currentValue,
      target,
      benchmark,
      vsTarget,
      vsBenchmark,
      status,
      trend,
    });
  }

  private async computeAndSaveGasEfficiency(maturities: any[]) {
    const { target, benchmark } = await this.getTargetBenchmark('Gas Efficiency');
    const currentValue = 0;
    const vsTarget = target != null ? currentValue - target : null;
    const vsBenchmark = benchmark != null ? currentValue - benchmark : null;
    const status = vsTarget != null && vsTarget > 0 ? '✅' : '❌';
    const trend = '↗️';

    await this.upsertOutput('gas_efficiency', {
      currentValue,
      target,
      benchmark,
      vsTarget,
      vsBenchmark,
      status,
      trend,
    });
  }

  private async computeAndSaveSlippageControl(maturities: any[]) {
    const { target, benchmark } = await this.getTargetBenchmark('Slippage Control');
    const currentValue = 0;
    const vsTarget = target != null ? currentValue - target : null;
    const vsBenchmark = benchmark != null ? currentValue - benchmark : null;
    const status = vsTarget != null && vsTarget > 0 ? '✅' : '❌';
    const trend = '↗️';

    await this.upsertOutput('slippage_control', {
      currentValue,
      target,
      benchmark,
      vsTarget,
      vsBenchmark,
      status,
      trend,
    });
  }
}





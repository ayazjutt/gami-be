import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { firstValueFrom } from 'rxjs';

/** Numbers that sometimes arrive as strings (bigints, fixed-point) */
type BigNumberish = string | number;

type SpectraPool = {
  address: string;
  chainId: number;
  lpt?: {
    address: string;
    decimals: number;
    chainId: number;
    supply?: BigNumberish;
    price?: { underlying?: number; usd?: number };
  };
  liquidity?: { underlying?: number; usd?: number };
  ptApy?: number;
  ytLeverage?: number;
  impliedApy?: number;
  lpApy?: {
    total?: number;
    details?: {
      fees?: number;
      pt?: number;
      ibt?: number;
      boostedRewards?: {
        [reward: string]: { min?: number; max?: number } | undefined;
      };
    };
    boostedTotal?: number;
  };
  ibtToPt?: BigNumberish;
  ptToIbt?: BigNumberish;
  spotPrice?: BigNumberish;
  ptPrice?: { underlying?: number; usd?: number };
  ytPrice?: { underlying?: number; usd?: number };
  ibtAmount?: BigNumberish;
  ptAmount?: BigNumberish;
  feeRate?: BigNumberish;
  outFee?: BigNumberish;
  midFee?: BigNumberish;
  ibtToPtFee?: BigNumberish;
  ptToIbtFee?: BigNumberish;
  lastPrices?: BigNumberish;
  type?: string;
};

type PortfolioItem = {
  // PT (maturity asset)
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  chainId: number;

  // Optional extras (we keep them inside payload)
  rate?: BigNumberish;
  tvl?: { ibt: number; underlying: number; usd: number };

  yt?: { address: string; decimals: number; chainId: number };
  ibt?: {
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    chainId: number;
    rate?: BigNumberish;
    spotRate?: BigNumberish;
    apr?: { total: number; details?: Record<string, number> };
    price?: { underlying?: number; usd?: number };
    logoURI?: string;
    protocol?: string;
  };
  underlying?: {
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    chainId: number;
    price?: { usd: number };
    logoURI?: string;
  };

  maturity: number;   // unix seconds
  createdAt: number;  // unix seconds

  pools?: SpectraPool[];

  maturityValue?: { underlying?: number; usd?: number };
  balance?: BigNumberish;
};

type AssetFound = {
  name: string;
  network: string; // 'base' | 'mainnet' | 'hyperevm' | 'avalanche'
  chain: string;
  chainId: number;
  address: string;  // pool address
  symbol: string;
};

@Injectable()
export class DiscoveryService {
  private readonly logger = new Logger(DiscoveryService.name);

  /** Provided discovery list */
  private readonly assetsFound: AssetFound[] = [
    { name: 'Spectra Pool (BASE)',       network: 'base',      chain: 'BASE',      chainId: 8453,  address: '0x96f93f632da15d425a030ae0e06a43e4947607ff', symbol: 'sUSDe' },
    { name: 'Spectra Pool (ETH mainnet)',network: 'mainnet',   chain: 'MAINNET',   chainId: 1,     address: '0xfda98290209f6747fb24078cef8d3088b0c2801f', symbol: 'ETH'  },
    { name: 'Spectra Pool (HyperEVM)',   network: 'hyperevm',  chain: 'HYPEREVM',  chainId: 0,     address: '0xc6860694b6bb878a33571e9c34a293abf0d5be9f', symbol: 'sUSDe'},
    { name: 'Spectra Pool (Avalanche)',  network: 'avalanche', chain: 'AVALANCHE', chainId: 43114, address: '0xbe33efefb9bc73b5ef1cd5c8bfd955e3bcb1aace', symbol: 'AVAX' },
  ];

  /** Default Spectra base URL */
  private readonly baseUrl = process.env.SPECTRA_BASE_URL ?? 'https://app.spectra.finance/api/v1';

  constructor(
    private readonly http: HttpService,
    private readonly prisma: PrismaService,
  ) {}

  /** Public entry: ALWAYS creates a new MaturitySnapshot for each item */
  async runOnce(): Promise<void> {
    for (const pool of this.assetsFound) {
      try {
        await this.processPool(pool);
      } catch (err: any) {
        this.logger.error(`❌ ${pool.network}:${pool.address} → ${err?.message ?? err}`);
      }
    }
  }

  /** Process a single pool/network */
  private async processPool(pool: AssetFound): Promise<void> {
    // 1) Ensure network exists (FK)
    const network = await this.prisma.network.upsert({
      where: { slug: pool.network },
      update: { name: capitalize(pool.network), chainId: pool.chainId || null },
      create: { name: capitalize(pool.network), slug: pool.network, chainId: pool.chainId || null },
    });

    // 2) Fetch the portfolio items (maturities for this pool)
    const url = `${this.baseUrl}/${pool.network}/portfolio/${pool.address}`;
    this.logger.log(`🔎 Fetching ${url}`);
    const { data } = await firstValueFrom(this.http.get<PortfolioItem[]>(url));

    if (!Array.isArray(data) || data.length === 0) {
      this.logger.warn(`⚠️ No portfolio items for ${pool.network}:${pool.address}`);
      return;
    }

    // 3) Insert a snapshot for each maturity item (ALWAYS create)
    for (const item of data) {
      const maturity = await this.createSnapshot(network.id, item); // now RETURNS the created snapshot

      await this.createInputSnapshot(maturity.id, item);            // uses the returned id
      await this.createOutputSnapshot(maturity.id, item);
    }
  }

  /** Creates one MaturitySnapshot from a portfolio item (ALWAYS create new row) */
  private async createSnapshot(networkId: number, item: PortfolioItem) {
    // ✅ enforce non-null PT address (API guarantees, but we assert)
    const ptAddress = lcStrict(item.address, 'portfolioItem.address');

    // upsert PT asset (address must be string, not null)
    const asset = await this.prisma.asset.upsert({
      where: { networkId_address: { networkId, address: ptAddress } },
      update: {
        name: item.name,
        symbol: item.ibt?.symbol,                  // ✅ string (not item.ibt?.symbol)
        decimals: item.decimals ?? 18,
      },
      create: {
        networkId,
        address: ptAddress,                   // ✅ string (non-null)
        name: item.name,
        symbol: item.ibt?.symbol,                  // ✅ string
        decimals: item.decimals ?? 18,
      },
    });

    // tenure from maturity
    const maturityTs = unixToDate(item.maturity);
    const days = daysToMaturity(maturityTs);
    const tenureTitle = toTenure(days);
    const tenure = await this.prisma.tenure.findUnique({ where: { title: tenureTitle } });

    const ibtAddress = lc(item.ibt?.address);
    const ytAddress  = lc(item.yt?.address);

    // ✅ create and RETURN the snapshot (so caller gets .id)
    const snapshot = await this.prisma.maturitySnapshot.create({
      data: {
        assetId: asset.id,
        tenureId: tenure?.id ?? null,
        maturityTs,
        source: 'Spectra Portfolio API',
        name: item.name,
        symbol: item.symbol,                  // ✅ string (fixes TS2322 at line ~201)
        ibtAddress,
        ytAddress,
        ptAddress,
        maturityCreatedAt: item.createdAt ? unixToDate(item.createdAt) : null,
        balance: item.balance != null ? String(item.balance) : null,
        pools: (item.pools ?? []) as any,
        payload: (item as any),
      },
      select: { id: true },                   // keep it lean; we only need id
    });

    return snapshot;                          // <-- THIS is the key
  }

  private async createInputSnapshot(
  maturitySnapshotId: number,
  portfolioItem: PortfolioItem,
): Promise<void> {
  // 1) Load snapshot + asset symbol
  const maturity = await this.prisma.maturitySnapshot.findUnique({
    where: { id: maturitySnapshotId },
    include: { asset: { select: { id: true, symbol: true } } },
  });
  if (!maturity) throw new Error(`MaturitySnapshot ${maturitySnapshotId} not found`);
  const assetId = maturity.asset.id;
  const assetSymbol = maturity.asset.symbol; // e.g. 'sUSDe'

  // 2) Resolve Roles
  const roles = await this.prisma.inputRole.findMany({ select: { id: true, title: true } });
  const roleByTitle = (t: string) => {
    const r = roles.find((x) => x.title === t)?.id;
    if (!r) throw new Error(`InputRole not seeded: "${t}"`);
    return r;
  };
  const ROLE_UNDER = roleByTitle('UNDERLYING ASSETS');
  const ROLE_PT    = roleByTitle('PRINCIPAL TOKENS (PT)');
  const ROLE_YT    = roleByTitle('YIELD TOKENS (YT)');

  // 3) Resolve generic metric IDs
  const metrics = await this.prisma.inputMetric.findMany({ select: { id: true, title: true } });
  const metricId = (title: string) => {
    const id = metrics.find((m) => m.title === title)?.id;
    if (!id) throw new Error(`InputMetric not seeded: "${title}"`);
    return id;
  };

  // 4) Thresholds
  const settingsRows = await this.prisma.setting.findMany({ select: { key: true, numValue: true } });
  const S = (k: string): number | null => {
    const v = settingsRows.find((r) => r.key === k)?.numValue;
    return v != null ? Number(v) : null;
  };
  const TH = {
    GAS: S('GAS_ALERT_THRESHOLD'),
    PT_MISPRICE: S('PT_MISPRICING_THRESHOLD'),
    YT_MISPRICE: S('YT_MISPRICING_THRESHOLD'),
    LIQUIDITY: S('LIQUIDITY_ALERT_THRESHOLD'),
    PEG: S('PEG_STABILITY_THRESHOLD'),
    DEFAULT: 2,
  };

  // 5) Extract values from Spectra
  const p0 = (portfolioItem.pools ?? [])[0];
  const impliedApy =
    num(p0?.impliedApy) ?? (num(portfolioItem?.ibt?.apr?.total) != null ? Number(portfolioItem!.ibt!.apr!.total) * 100 : null);
  const pegUsd        = num(portfolioItem?.underlying?.price?.usd);
  const liqUnderlying = num(p0?.liquidity?.underlying);
  const gasGwei: number | null = null; // TODO: integrate gas oracle if/when needed

  const ptPriceUsd   = num(p0?.ptPrice?.usd);
  const fairValueUsd = num(portfolioItem?.maturityValue?.usd);
  const ptMispricingPct =
    ptPriceUsd != null && fairValueUsd && fairValueUsd !== 0
      ? Math.abs((ptPriceUsd - fairValueUsd) / fairValueUsd) * 100
      : null;

  const ytPriceUsd   = num(p0?.ytPrice?.usd);
  const ytAccumulated: number | null = null; // not defined yet

  // 6) Tenor & generic titles
  const maturityTs = new Date((portfolioItem.maturity ?? 0) * 1000);
  const tenor = toTenure(daysToMaturity(maturityTs)); // '3M'|'6M'|'12M'

  // Generic metric titles in DB:
  const METRIC_APY           = 'APY';
  const METRIC_PEG           = 'Peg Stability';
  const METRIC_LIQUIDITY     = 'Liquidity Depth';
  const METRIC_GAS           = 'Gas Price (Gwei)';
  const METRIC_PRICE_GENERIC = `${tenor} Price`;         // '3M Price' | '6M Price' | '12M Price'
  const METRIC_FAIR_GENERIC  = `${tenor} Fair Value`;    // '3M Fair Value' | etc.
  const METRIC_YT_ACC        = `YT-${tenor} Accumulated`;

  // Display strings (stored in InputSnapshot.metric for UI)
  const DISP_APY         = `${assetSymbol} APY`;
  const DISP_PEG         = `${assetSymbol} Peg Stability`;
  const DISP_LIQUIDITY   = `${assetSymbol} Liquidity Depth`;
  const DISP_GAS         = `Gas Price (Gwei)`;
  const DISP_PT_PRICE    = `PT-${assetSymbol}-${tenor} Price`;
  const DISP_PT_FAIR     = `PT-${tenor} Fair Value`;
  const DISP_YT_PRICE    = `YT-${assetSymbol}-${tenor} Price`;
  const DISP_YT_ACC      = `YT-${tenor} Accumulated`;

  // helper: previous value lookup MUST be role + metric + asset-scoped
  const prevOf = async (inputRoleId: number, inputMetricTitle: string) => {
    const prev = await this.prisma.inputSnapshot.findFirst({
      where: {
        inputRoleId,
        inputMetricId: metricId(inputMetricTitle),
        maturitySnapshot: { assetId },
      },
      orderBy: { timestamp: 'desc' },
      select: { currentValue: true },
    });
    return prev?.currentValue != null ? Number(prev.currentValue as any) : null;
  };

  const rows: Prisma.InputSnapshotCreateManyInput[] = [];

  // UNDERLYING — use generic metric IDs but display includes asset symbol
  rows.push(buildRow({
    maturitySnapshotId,
    inputRoleId: ROLE_UNDER,
    inputMetricId: metricId(METRIC_APY),
    metricTitle: DISP_APY,
    currentValue: impliedApy,
    previousValue: await prevOf(ROLE_UNDER, METRIC_APY),
    threshold: TH.DEFAULT,
    status: impliedApy != null ? '✅' : null,
    alert: false,
    source: 'Spectra API',
  }));

  rows.push(buildRow({
    maturitySnapshotId,
    inputRoleId: ROLE_UNDER,
    inputMetricId: metricId(METRIC_PEG),
    metricTitle: DISP_PEG,
    currentValue: pegUsd,
    previousValue: await prevOf(ROLE_UNDER, METRIC_PEG),
    threshold: TH.PEG,
    status: pegStatus(pegUsd, TH.PEG),
    alert: pegAlert(pegUsd, TH.PEG),
    source: 'Spectra API',
  }));

  rows.push(buildRow({
    maturitySnapshotId,
    inputRoleId: ROLE_UNDER,
    inputMetricId: metricId(METRIC_LIQUIDITY),
    metricTitle: DISP_LIQUIDITY,
    currentValue: liqUnderlying,
    previousValue: await prevOf(ROLE_UNDER, METRIC_LIQUIDITY),
    threshold: TH.LIQUIDITY,
    status: liqUnderlying != null && liqUnderlying > 0 ? '✅' : null,
    alert: false,
    source: 'Spectra API',
  }));

  rows.push(buildRow({
    maturitySnapshotId,
    inputRoleId: ROLE_UNDER,
    inputMetricId: metricId(METRIC_GAS),
    metricTitle: DISP_GAS,
    currentValue: gasGwei,
    previousValue: await prevOf(ROLE_UNDER, METRIC_GAS),
    threshold: TH.GAS,
    status: null,
    alert: false,
    source: 'Spectra API',
  }));

  // PT — generic IDs ('3M Price', '3M Fair Value'), display includes PT and asset symbol
  rows.push(buildRow({
    maturitySnapshotId,
    inputRoleId: ROLE_PT,
    inputMetricId: metricId(METRIC_PRICE_GENERIC),
    metricTitle: DISP_PT_PRICE,
    currentValue: ptPriceUsd,
    previousValue: await prevOf(ROLE_PT, METRIC_PRICE_GENERIC),
    threshold: TH.PT_MISPRICE,
    status: ptPriceUsd != null ? '✅' : null,
    alert: overThreshold(ptMispricingPct, TH.PT_MISPRICE),
    source: 'Spectra API',
  }));

  rows.push(buildRow({
    maturitySnapshotId,
    inputRoleId: ROLE_PT,
    inputMetricId: metricId(METRIC_FAIR_GENERIC),
    metricTitle: DISP_PT_FAIR,
    currentValue: fairValueUsd,
    previousValue: await prevOf(ROLE_PT, METRIC_FAIR_GENERIC),
    threshold: TH.PT_MISPRICE,
    status: fairValueUsd != null ? '✅' : null,
    alert: false,
    source: 'Spectra API',
  }));

  // YT — price uses same generic metric id (e.g. '3M Price') but role is YT;
  // accumulated uses its own generic 'YT-3M Accumulated'
  rows.push(buildRow({
    maturitySnapshotId,
    inputRoleId: ROLE_YT,
    inputMetricId: metricId(METRIC_PRICE_GENERIC),
    metricTitle: DISP_YT_PRICE,
    currentValue: ytPriceUsd,
    previousValue: await prevOf(ROLE_YT, METRIC_PRICE_GENERIC),
    threshold: TH.YT_MISPRICE,
    status: ytPriceUsd != null ? '✅' : null,
    alert: false,
    source: 'Spectra API',
  }));

  rows.push(buildRow({
    maturitySnapshotId,
    inputRoleId: ROLE_YT,
    inputMetricId: metricId(METRIC_YT_ACC),
    metricTitle: DISP_YT_ACC,
    currentValue: ytAccumulated,
    previousValue: await prevOf(ROLE_YT, METRIC_YT_ACC),
    threshold: TH.YT_MISPRICE,
    status: null,
    alert: false,
    source: 'Spectra API',
  }));

  await this.prisma.inputSnapshot.createMany({ data: rows, skipDuplicates: false });
}

  private async createOutputSnapshot(
    maturitySnapshotId: number,
    portfolioItem: PortfolioItem,
  ): Promise<void> {
    const maturity = await this.prisma.maturitySnapshot.findUnique({
      where: { id: maturitySnapshotId },
      include: { asset: { select: { id: true } } },
    });
    if (!maturity) {
      throw new Error(`MaturitySnapshot ${maturitySnapshotId} not found`);
    }
    const assetId = maturity.asset.id;

    const metrics = await this.prisma.outputMetric.findMany({
      select: { id: true, title: true },
    });
    const metricId = (title: string) => {
      const id = metrics.find((m) => m.title === title)?.id;
      if (!id) throw new Error(`OutputMetric not seeded: "${title}"`);
      return id;
    };

    const prevOf = async (title: string) => {
      const id = metricId(title);
      const prev = await this.prisma.outputSnapshot.findFirst({
        where: { outputMetricId: id, maturitySnapshot: { assetId } },
        orderBy: { createdAt: 'desc' },
        select: { currentValue: true },
      });
      return prev?.currentValue != null ? Number(prev.currentValue as any) : null;
    };

    const settingsRows = await this.prisma.setting.findMany({
      select: { key: true, numValue: true },
    });
    const S = (key: string): number | null => {
      const match = settingsRows.find((row) => row.key === key)?.numValue;
      return match != null ? Number(match) : null;
    };

    const managementFee = S('MANAGEMENT_FEE_RATE');
    const performanceFee = S('PERFORMANCE_FEE_RATE');
    const benchmarkApy = S('BENCHMARK_APY');
    const targetAlpha = S('TARGET_ALPHA');
    const harvestThreshold = S('HARVEST_THRESHOLD');
    const gasThreshold = S('GAS_ALERT_THRESHOLD');
    const rebalanceThreshold = S('REBALANCE_THRESHOLD');

    const pool = (portfolioItem.pools ?? [])[0];

    const impliedApyPct =
      num(pool?.impliedApy) ??
      (num(portfolioItem?.ibt?.apr?.total) != null
        ? Number(portfolioItem!.ibt!.apr!.total) * 100
        : null);
    const grossApyDecimal = impliedApyPct != null ? impliedApyPct / 100 : null;

    const netApyDecimal = grossApyDecimal != null
      ? (() => {
          let net = grossApyDecimal;
          if (managementFee != null) net -= managementFee;
          if (performanceFee != null && benchmarkApy != null) {
            const perfBase = Math.max(grossApyDecimal - benchmarkApy, 0);
            net -= perfBase * performanceFee;
          }
          return net;
        })()
      : null;
    const netApyPercent = netApyDecimal != null ? netApyDecimal * 100 : null;

    const alphaDecimal =
      netApyDecimal != null && benchmarkApy != null ? netApyDecimal - benchmarkApy : null;
    const alphaPercent = alphaDecimal != null ? alphaDecimal * 100 : null;
    const sharpeRatio =
      alphaDecimal != null && rebalanceThreshold != null && rebalanceThreshold > 0
        ? alphaDecimal / rebalanceThreshold
        : null;

    const ptPriceUsd = num(pool?.ptPrice?.usd);
    const fairValueUsd = num(portfolioItem?.maturityValue?.usd);
    const maxDrawdownPct =
      ptPriceUsd != null && fairValueUsd != null && fairValueUsd !== 0
        ? ((fairValueUsd - ptPriceUsd) / fairValueUsd) * 100
        : null;

    const yieldEfficiencyPct =
      grossApyDecimal != null && grossApyDecimal > 0 && netApyDecimal != null
        ? (netApyDecimal / grossApyDecimal) * 100
        : null;

    const tvlUsd = num(portfolioItem?.tvl?.usd);
    const annualYield = tvlUsd != null && netApyDecimal != null ? tvlUsd * netApyDecimal : null;
    const harvestsPerYear =
      annualYield != null && harvestThreshold != null && harvestThreshold > 0
        ? annualYield / harvestThreshold
        : null;

    const gasUsedGwei = scaled(pool?.feeRate, 6);
    const gasEfficiencyPct =
      gasThreshold != null && gasThreshold > 0 && gasUsedGwei != null
        ? ((gasThreshold - gasUsedGwei) / gasThreshold) * 100
        : null;

    const spotPrice = scaled(pool?.spotPrice, 18);
    const slippagePct = spotPrice != null ? Math.abs(spotPrice - 1) * 100 : null;

    const benchmarkPercent = benchmarkApy != null ? benchmarkApy * 100 : null;
    const targetAlphaPercent = targetAlpha != null ? targetAlpha * 100 : null;
    const netTarget =
      benchmarkPercent != null && targetAlphaPercent != null
        ? benchmarkPercent + targetAlphaPercent
        : null;
    const drawdownThreshold = rebalanceThreshold != null ? rebalanceThreshold * 100 : 10;
    const yieldEfficiencyTarget = managementFee != null ? (1 - managementFee) * 100 : 90;
    const harvestTarget = 12;
    const gasTarget = gasThreshold != null ? gasThreshold * 0.8 : null;
    const slippageTarget = 1;

    const rows: Prisma.OutputSnapshotCreateManyInput[] = [];

    const metaPrev = await prevOf('MetaVault Net APY');
    rows.push(
      buildOutputRow({
        maturitySnapshotId,
        outputMetricId: metricId('MetaVault Net APY'),
        currentValue: netApyPercent,
        target: netTarget,
        benchmark: benchmarkPercent,
        vsTarget: diff(netApyPercent, netTarget),
        vsBenchmark: diff(netApyPercent, benchmarkPercent),
        status:
          netApyPercent != null && netTarget != null
            ? netApyPercent >= netTarget
              ? 'On Track'
              : 'Lagging'
            : null,
        trend: trend(metaPrev, netApyPercent),
      }),
    );

    const alphaPrev = await prevOf('Alpha Generation');
    rows.push(
      buildOutputRow({
        maturitySnapshotId,
        outputMetricId: metricId('Alpha Generation'),
        currentValue: alphaPercent,
        target: targetAlphaPercent,
        benchmark: 0,
        vsTarget: diff(alphaPercent, targetAlphaPercent),
        vsBenchmark: diff(alphaPercent, 0),
        status:
          alphaPercent != null && targetAlphaPercent != null
            ? alphaPercent >= targetAlphaPercent
              ? 'On Track'
              : 'Lagging'
            : null,
        trend: trend(alphaPrev, alphaPercent),
      }),
    );

    const sharpePrev = await prevOf('Sharpe Ratio');
    rows.push(
      buildOutputRow({
        maturitySnapshotId,
        outputMetricId: metricId('Sharpe Ratio'),
        currentValue: sharpeRatio,
        target: 1,
        benchmark: 0,
        vsTarget: diff(sharpeRatio, 1),
        vsBenchmark: diff(sharpeRatio, 0),
        status: sharpeRatio != null ? (sharpeRatio >= 1 ? 'On Track' : 'Lagging') : null,
        trend: trend(sharpePrev, sharpeRatio),
      }),
    );

    const drawdownPrev = await prevOf('Maximum Drawdown');
    rows.push(
      buildOutputRow({
        maturitySnapshotId,
        outputMetricId: metricId('Maximum Drawdown'),
        currentValue: maxDrawdownPct,
        target: 0,
        benchmark: drawdownThreshold,
        vsTarget: diff(maxDrawdownPct, 0),
        vsBenchmark: diff(maxDrawdownPct, drawdownThreshold),
        status:
          maxDrawdownPct != null
            ? maxDrawdownPct <= drawdownThreshold
              ? 'On Track'
              : 'Lagging'
            : null,
        trend: trend(drawdownPrev, maxDrawdownPct),
      }),
    );

    const efficiencyPrev = await prevOf('Yield Efficiency');
    rows.push(
      buildOutputRow({
        maturitySnapshotId,
        outputMetricId: metricId('Yield Efficiency'),
        currentValue: yieldEfficiencyPct,
        target: yieldEfficiencyTarget,
        benchmark: 100,
        vsTarget: diff(yieldEfficiencyPct, yieldEfficiencyTarget),
        vsBenchmark: diff(yieldEfficiencyPct, 100),
        status:
          yieldEfficiencyPct != null && yieldEfficiencyTarget != null
            ? yieldEfficiencyPct >= yieldEfficiencyTarget
              ? 'On Track'
              : 'Lagging'
            : null,
        trend: trend(efficiencyPrev, yieldEfficiencyPct),
      }),
    );

    const harvestPrev = await prevOf('Harvest Frequency');
    rows.push(
      buildOutputRow({
        maturitySnapshotId,
        outputMetricId: metricId('Harvest Frequency'),
        currentValue: harvestsPerYear,
        target: harvestTarget,
        benchmark: null,
        vsTarget: diff(harvestsPerYear, harvestTarget),
        vsBenchmark: null,
        status:
          harvestsPerYear != null
            ? harvestsPerYear >= harvestTarget
              ? 'On Track'
              : 'Lagging'
            : null,
        trend: trend(harvestPrev, harvestsPerYear),
      }),
    );

    const gasPrev = await prevOf('Gas Efficiency');
    rows.push(
      buildOutputRow({
        maturitySnapshotId,
        outputMetricId: metricId('Gas Efficiency'),
        currentValue: gasEfficiencyPct,
        target:
          gasTarget != null && gasThreshold != null
            ? ((gasThreshold - gasTarget) / gasThreshold) * 100
            : null,
        benchmark: 0,
        vsTarget:
          gasEfficiencyPct != null && gasTarget != null && gasThreshold != null
            ? gasEfficiencyPct - ((gasThreshold - gasTarget) / gasThreshold) * 100
            : null,
        vsBenchmark: diff(gasEfficiencyPct, 0),
        status:
          gasUsedGwei != null && gasThreshold != null
            ? gasUsedGwei <= gasThreshold
              ? 'On Track'
              : 'Lagging'
            : null,
        trend: trend(gasPrev, gasEfficiencyPct),
      }),
    );

    const slippagePrev = await prevOf('Slippage Control');
    rows.push(
      buildOutputRow({
        maturitySnapshotId,
        outputMetricId: metricId('Slippage Control'),
        currentValue: slippagePct,
        target: slippageTarget,
        benchmark: 0,
        vsTarget: diff(slippagePct, slippageTarget),
        vsBenchmark: diff(slippagePct, 0),
        status:
          slippagePct != null
            ? slippagePct <= slippageTarget
              ? 'On Track'
              : 'Lagging'
            : null,
        trend: trend(slippagePrev, slippagePct),
      }),
    );

    await this.prisma.outputSnapshot.createMany({ data: rows, skipDuplicates: false });
  }
}

/** ---------- helpers ---------- */
function capitalize(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

// ---------- helpers (place ONCE, outside the class) ----------
function lc(v?: string): string | null {
  return v ? v.toLowerCase() : null;
}
function lcStrict(v: string | undefined | null, field: string): string {
  if (!v) throw new Error(`Missing required address: ${field}`);
  return v.toLowerCase();
}
function unixToDate(sec?: number): Date {
  if (!sec) return new Date(0);
  return new Date(sec * 1000);
}
function daysToMaturity(maturityTs: Date): number {
  const now = new Date();
  const ms = Math.max(0, maturityTs.getTime() - now.getTime());
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}
function toTenure(days: number): '3M' | '6M' | '12M' {
  if (days <= 120) return '3M';
  if (days <= 240) return '6M';
  return '12M';
}
function num(v: unknown): number | null {
  const n = Number(v as any);
  return Number.isFinite(n) ? n : null;
}
function pct(prev: number | null, cur: number | null): number | null {
  if (prev == null || cur == null) return null;
  if (prev === 0) return cur === 0 ? 0 : null;
  return ((cur - prev) / Math.abs(prev)) * 100;
}
function toDec(n: number | null | undefined): Prisma.Decimal | null {
  if (n == null) return null;
  return new Prisma.Decimal(n);
}
function buildRow(opts: {
  maturitySnapshotId: number;
  inputRoleId: number;
  inputMetricId: number;
  metricTitle: string;
  currentValue: number | null;
  previousValue: number | null;
  threshold: number | null;
  status: string | null;
  alert: boolean;
  source: string;
}) {
  return {
    maturitySnapshotId: opts.maturitySnapshotId,
    inputRoleId: opts.inputRoleId,
    inputMetricId: opts.inputMetricId,
    timestamp: new Date(),
    metric: opts.metricTitle,
    currentValue: toDec(opts.currentValue),
    previousValue: toDec(opts.previousValue),
    changePct: toDec(pct(opts.previousValue, opts.currentValue)),
    threshold: toDec(opts.threshold),
    status: opts.status,
    alert: opts.alert,
    source: opts.source,
    notes: null,
  } as const;
}
function pegStatus(usd: number | null, thr: number | null): string | null {
  if (usd == null || thr == null) return null;
  return Math.abs(usd - 1) <= thr ? '✅' : '⚠️';
}
function pegAlert(usd: number | null, thr: number | null): boolean {
  if (usd == null || thr == null) return false;
  return Math.abs(usd - 1) > thr;
}
function overThreshold(valuePct: number | null, thrPct: number | null): boolean {
  if (valuePct == null || thrPct == null) return false;
  return valuePct > thrPct;
}
function diff(cur: number | null | undefined, ref: number | null | undefined): number | null {
  if (cur == null || ref == null) return null;
  return cur - ref;
}
function trend(prev: number | null, cur: number | null): string | null {
  if (prev == null || cur == null) return null;
  if (Math.abs(cur - prev) < 1e-6) return 'Flat';
  return cur > prev ? 'Up' : 'Down';
}
function buildOutputRow(opts: {
  maturitySnapshotId: number;
  outputMetricId: number;
  currentValue: number | null;
  target: number | null;
  benchmark: number | null;
  vsTarget: number | null;
  vsBenchmark: number | null;
  status: string | null;
  trend: string | null;
}): Prisma.OutputSnapshotCreateManyInput {
  return {
    maturitySnapshotId: opts.maturitySnapshotId,
    outputMetricId: opts.outputMetricId,
    currentValue: toDec(opts.currentValue),
    target: toDec(opts.target),
    benchmark: toDec(opts.benchmark),
    vsTarget: toDec(opts.vsTarget),
    vsBenchmark: toDec(opts.vsBenchmark),
    status: opts.status ?? null,
    trend: opts.trend ?? null,
  };
}
function scaled(value: BigNumberish | null | undefined, decimals: number): number | null {
  if (value == null) return null;
  try {
    const dec = new Prisma.Decimal(value as any);
    const divisor = new Prisma.Decimal(10).pow(decimals);
    return Number(dec.div(divisor));
  } catch {
    return null;
  }
}
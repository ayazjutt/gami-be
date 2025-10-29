import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Prisma, PrismaClient } from '@prisma/client';
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
  // async runOnce(): Promise<void> {
  //   for (const pool of this.assetsFound) {
  //     try {
  //       await this.processPool(pool);
  //     } catch (err: any) {
  //       this.logger.error(`âŒ ${pool.network}:${pool.address} â†’ ${err?.message ?? err}`);
  //     }
  //   }
  // }

  /** Process a single pool/network */
//   private async processPool(pool: AssetFound): Promise<void> {
//     // 1) Ensure network exists (FK)
//     const network = await this.prisma.network.upsert({
//       where: { slug: pool.network },
//       update: { name: capitalize(pool.network), chainId: pool.chainId || null },
//       create: { name: capitalize(pool.network), slug: pool.network, chainId: pool.chainId || null },
//     });

//     // 2) Fetch the portfolio items (maturities for this pool)
//     const url = `${this.baseUrl}/${pool.network}/portfolio/${pool.address}`;
//     this.logger.log(`ðŸ”Ž Fetching ${url}`);
//     const { data } = await firstValueFrom(this.http.get<PortfolioItem[]>(url));

//     if (!Array.isArray(data) || data.length === 0) {
//       this.logger.warn(`âš ï¸ No portfolio items for ${pool.network}:${pool.address}`);
//       return;
//     }

//     // 3) Insert a snapshot for each maturity item (ALWAYS create)
//     for (const item of data) {
//       const maturity = await this.createSnapshot(network.id, item); // now RETURNS the created snapshot
      
//       await this.createInputSnapshot(maturity.id, item);            // uses the returned id
//     }
//   }

//   /** Creates one MaturitySnapshot from a portfolio item (ALWAYS create new row) */
//   private async createSnapshot(networkId: number, item: PortfolioItem) {
//     // âœ… enforce non-null PT address (API guarantees, but we assert)
//     const ptAddress = lcStrict(item.address, 'portfolioItem.address');

//     // upsert PT asset (address must be string, not null)
//     const asset = await this.prisma.asset.upsert({
//       where: { networkId_address: { networkId, address: ptAddress } },
//       update: {
//         name: item.name,
//         symbol: item.ibt?.symbol ?? 'UNKNOWN',                  // âœ… string (not item.ibt?.symbol)
//         decimals: item.decimals ?? 18,
//       },
//       create: {
//         networkId,
//         address: ptAddress,                   // âœ… string (non-null)
//         name: item.name,
//         symbol: item.ibt?.symbol ?? 'UNKNOWN',                  // âœ… string
//         decimals: item.decimals ?? 18,
//       },
//     });

//     // tenure from maturity
//     const maturityTs = unixToDate(item.maturity);
//     const days = daysToMaturity(maturityTs);
//     const tenureTitle = toTenure(days);
//     const tenure = await this.prisma.tenure.findUnique({ where: { title: tenureTitle } });

//     const ibtAddress = lc(item.ibt?.address);
//     const ytAddress  = lc(item.yt?.address);

//     // âœ… create and RETURN the snapshot (so caller gets .id)
//     const snapshot = await this.prisma.maturitySnapshot.create({
//       data: {
//         assetId: asset.id,
//         tenureId: tenure?.id ?? null,
//         maturityTs,
//         source: 'Spectra Portfolio API',
//         name: item.name,
//         symbol: item.ibt?.symbol ?? 'UNKNOWN',                  // âœ… string (fixes TS2322 at line ~201)
//         ibtAddress,
//         ytAddress,
//         ptAddress,
//         maturityCreatedAt: item.createdAt ? unixToDate(item.createdAt) : null,
//         balance: item.balance != null ? String(item.balance) : null,
//         pools: (item.pools ?? []) as any,
//         payload: (item as any),
//       },
//       select: { id: true },                   // keep it lean; we only need id
//     });

//     return snapshot;                          // <-- THIS is the key
//   }

//   private async createInputSnapshot(
//   maturitySnapshotId: number,
//   portfolioItem: PortfolioItem,
// ): Promise<void> {
//   // 1) Load snapshot + asset symbol
//   const maturity = await this.prisma.maturitySnapshot.findUnique({
//     where: { id: maturitySnapshotId },
//     include: { asset: { select: { id: true, symbol: true } } },
//   });
//   if (!maturity) throw new Error(`MaturitySnapshot ${maturitySnapshotId} not found`);
//   const assetId = maturity.asset.id;
//   const assetSymbol = maturity.asset.symbol; // e.g. 'sUSDe'

//   // 2) Resolve Roles
//   const roles = await this.prisma.inputRole.findMany({ select: { id: true, title: true } });
//   const roleByTitle = (t: string) => {
//     const r = roles.find((x) => x.title === t)?.id;
//     if (!r) throw new Error(`InputRole not seeded: "${t}"`);
//     return r;
//   };
//   const ROLE_UNDER = roleByTitle('UNDERLYING ASSETS');
//   const ROLE_PT    = roleByTitle('PRINCIPAL TOKENS (PT)');
//   const ROLE_YT    = roleByTitle('YIELD TOKENS (YT)');

//   // 3) Resolve generic metric IDs
//   const metrics = await this.prisma.inputMetric.findMany({ select: { id: true, title: true } });
//   const metricId = (title: string) => {
//     const id = metrics.find((m) => m.title === title)?.id;
//     if (!id) throw new Error(`InputMetric not seeded: "${title}"`);
//     return id;
//   };

//   // 4) Thresholds
//   const settingsRows = await this.prisma.setting.findMany({ select: { key: true, numValue: true } });
//   const S = (k: string): number | null => {
//     const v = settingsRows.find((r) => r.key === k)?.numValue;
//     return v != null ? Number(v) : null;
//   };
//   const TH = {
//     GAS: S('GAS_ALERT_THRESHOLD'),
//     PT_MISPRICE: S('PT_MISPRICING_THRESHOLD'),
//     YT_MISPRICE: S('YT_MISPRICING_THRESHOLD'),
//     LIQUIDITY: S('LIQUIDITY_ALERT_THRESHOLD'),
//     PEG: S('PEG_STABILITY_THRESHOLD'),
//     DEFAULT: 2,
//   };

//   // 5) Extract values from Spectra
//   const p0 = (portfolioItem.pools ?? [])[0];
//   const impliedApy =
//     num(p0?.impliedApy) ?? (num(portfolioItem?.ibt?.apr?.total) != null ? Number(portfolioItem!.ibt!.apr!.total) * 100 : null);
//   const pegUsd        = num(portfolioItem?.underlying?.price?.usd);
//   const liqUnderlying = num(p0?.liquidity?.underlying);
//   const gasGwei: number | null = null; // TODO: integrate gas oracle if/when needed

//   const ptPriceUsd   = num(p0?.ptPrice?.usd);
//   const fairValueUsd = num(portfolioItem?.maturityValue?.usd);
//   const ptMispricingPct =
//     ptPriceUsd != null && fairValueUsd && fairValueUsd !== 0
//       ? Math.abs((ptPriceUsd - fairValueUsd) / fairValueUsd) * 100
//       : null;

//   const ytPriceUsd   = num(p0?.ytPrice?.usd);
//   const ytAccumulated: number | null = null; // not defined yet

//   // 6) Tenor & generic titles
//   const maturityTs = new Date((portfolioItem.maturity ?? 0) * 1000);
//   const tenor = toTenure(daysToMaturity(maturityTs)); // '3M'|'6M'|'12M'

//   // Generic metric titles in DB:
//   const METRIC_APY           = 'APY';
//   const METRIC_PEG           = 'Peg Stability';
//   const METRIC_LIQUIDITY     = 'Liquidity Depth';
//   const METRIC_GAS           = 'Gas Price (Gwei)';
//   const METRIC_PRICE_GENERIC = `${tenor} Price`;         // '3M Price' | '6M Price' | '12M Price'
//   const METRIC_FAIR_GENERIC  = `${tenor} Fair Value`;    // '3M Fair Value' | etc.
//   const METRIC_YT_ACC        = `YT-${tenor} Accumulated`;

//   // Display strings (stored in InputSnapshot.metric for UI)
//   const DISP_APY         = `${assetSymbol} APY`;
//   const DISP_PEG         = `${assetSymbol} Peg Stability`;
//   const DISP_LIQUIDITY   = `${assetSymbol} Liquidity Depth`;
//   const DISP_GAS         = `Gas Price (Gwei)`;
//   const DISP_PT_PRICE    = `PT-${assetSymbol}-${tenor} Price`;
//   const DISP_PT_FAIR     = `PT-${tenor} Fair Value`;
//   const DISP_YT_PRICE    = `YT-${assetSymbol}-${tenor} Price`;
//   const DISP_YT_ACC      = `YT-${tenor} Accumulated`;

//   // helper: previous value lookup MUST be role + metric + asset-scoped
//   const prevOf = async (inputRoleId: number, inputMetricTitle: string) => {
//     const prev = await this.prisma.inputSnapshot.findFirst({
//       where: {
//         inputRoleId,
//         inputMetricId: metricId(inputMetricTitle),
//         maturitySnapshot: { assetId },
//       },
//       orderBy: { timestamp: 'desc' },
//       select: { currentValue: true },
//     });
//     return prev?.currentValue != null ? Number(prev.currentValue as any) : null;
//   };

//   const rows: Prisma.InputSnapshotCreateManyInput[] = [];

//   // UNDERLYING â€” use generic metric IDs but display includes asset symbol
//   rows.push(buildRow({
//     maturitySnapshotId,
//     inputRoleId: ROLE_UNDER,
//     inputMetricId: metricId(METRIC_APY),
//     metricTitle: DISP_APY,
//     currentValue: impliedApy,
//     previousValue: await prevOf(ROLE_UNDER, METRIC_APY),
//     threshold: TH.DEFAULT,
//     status: impliedApy != null ? 'âœ…' : null,
//     alert: false,
//     source: 'Spectra API',
//   }));

//   rows.push(buildRow({
//     maturitySnapshotId,
//     inputRoleId: ROLE_UNDER,
//     inputMetricId: metricId(METRIC_PEG),
//     metricTitle: DISP_PEG,
//     currentValue: pegUsd,
//     previousValue: await prevOf(ROLE_UNDER, METRIC_PEG),
//     threshold: TH.PEG,
//     status: pegStatus(pegUsd, TH.PEG),
//     alert: pegAlert(pegUsd, TH.PEG),
//     source: 'Spectra API',
//   }));

//   rows.push(buildRow({
//     maturitySnapshotId,
//     inputRoleId: ROLE_UNDER,
//     inputMetricId: metricId(METRIC_LIQUIDITY),
//     metricTitle: DISP_LIQUIDITY,
//     currentValue: liqUnderlying,
//     previousValue: await prevOf(ROLE_UNDER, METRIC_LIQUIDITY),
//     threshold: TH.LIQUIDITY,
//     status: liqUnderlying != null && liqUnderlying > 0 ? 'âœ…' : null,
//     alert: false,
//     source: 'Spectra API',
//   }));

//   rows.push(buildRow({
//     maturitySnapshotId,
//     inputRoleId: ROLE_UNDER,
//     inputMetricId: metricId(METRIC_GAS),
//     metricTitle: DISP_GAS,
//     currentValue: gasGwei,
//     previousValue: await prevOf(ROLE_UNDER, METRIC_GAS),
//     threshold: TH.GAS,
//     status: null,
//     alert: false,
//     source: 'Spectra API',
//   }));

//   // PT â€” generic IDs ('3M Price', '3M Fair Value'), display includes PT and asset symbol
//   rows.push(buildRow({
//     maturitySnapshotId,
//     inputRoleId: ROLE_PT,
//     inputMetricId: metricId(METRIC_PRICE_GENERIC),
//     metricTitle: DISP_PT_PRICE,
//     currentValue: ptPriceUsd,
//     previousValue: await prevOf(ROLE_PT, METRIC_PRICE_GENERIC),
//     threshold: TH.PT_MISPRICE,
//     status: ptPriceUsd != null ? 'âœ…' : null,
//     alert: overThreshold(ptMispricingPct, TH.PT_MISPRICE),
//     source: 'Spectra API',
//   }));

//   rows.push(buildRow({
//     maturitySnapshotId,
//     inputRoleId: ROLE_PT,
//     inputMetricId: metricId(METRIC_FAIR_GENERIC),
//     metricTitle: DISP_PT_FAIR,
//     currentValue: fairValueUsd,
//     previousValue: await prevOf(ROLE_PT, METRIC_FAIR_GENERIC),
//     threshold: TH.PT_MISPRICE,
//     status: fairValueUsd != null ? 'âœ…' : null,
//     alert: false,
//     source: 'Spectra API',
//   }));

//   // YT â€” price uses same generic metric id (e.g. '3M Price') but role is YT;
//   // accumulated uses its own generic 'YT-3M Accumulated'
//   rows.push(buildRow({
//     maturitySnapshotId,
//     inputRoleId: ROLE_YT,
//     inputMetricId: metricId(METRIC_PRICE_GENERIC),
//     metricTitle: DISP_YT_PRICE,
//     currentValue: ytPriceUsd,
//     previousValue: await prevOf(ROLE_YT, METRIC_PRICE_GENERIC),
//     threshold: TH.YT_MISPRICE,
//     status: ytPriceUsd != null ? 'âœ…' : null,
//     alert: false,
//     source: 'Spectra API',
//   }));

//   rows.push(buildRow({
//     maturitySnapshotId,
//     inputRoleId: ROLE_YT,
//     inputMetricId: metricId(METRIC_YT_ACC),
//     metricTitle: DISP_YT_ACC,
//     currentValue: ytAccumulated,
//     previousValue: await prevOf(ROLE_YT, METRIC_YT_ACC),
//     threshold: TH.YT_MISPRICE,
//     status: null,
//     alert: false,
//     source: 'Spectra API',
//   }));

//   await this.prisma.inputSnapshot.createMany({ data: rows, skipDuplicates: false });
// }
// }

// /** ---------- helpers ---------- */
// function capitalize(s: string) {
//   return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
// }

// // ---------- helpers (place ONCE, outside the class) ----------
// function lc(v?: string): string | null {
//   return v ? v.toLowerCase() : null;
// }
// function lcStrict(v: string | undefined | null, field: string): string {
//   if (!v) throw new Error(`Missing required address: ${field}`);
//   return v.toLowerCase();
// }
// function unixToDate(sec?: number): Date {
//   if (!sec) return new Date(0);
//   return new Date(sec * 1000);
// }
// function daysToMaturity(maturityTs: Date): number {
//   const now = new Date();
//   const ms = Math.max(0, maturityTs.getTime() - now.getTime());
//   return Math.floor(ms / (1000 * 60 * 60 * 24));
// }
// function toTenure(days: number): '3M' | '6M' | '12M' {
//   if (days <= 120) return '3M';
//   if (days <= 240) return '6M';
//   return '12M';
// }
// function num(v: unknown): number | null {
//   const n = Number(v as any);
//   return Number.isFinite(n) ? n : null;
// }
// function pct(prev: number | null, cur: number | null): number | null {
//   if (prev == null || cur == null) return null;
//   if (prev === 0) return cur === 0 ? 0 : null;
//   return ((cur - prev) / Math.abs(prev)) * 100;
// }
// function toDec(n: number | null | undefined): Prisma.Decimal | null {
//   if (n == null) return null;
//   return new Prisma.Decimal(n);
// }
// function buildRow(opts: {
//   maturitySnapshotId: number;
//   inputRoleId: number;
//   inputMetricId: number;
//   metricTitle: string;
//   currentValue: number | null;
//   previousValue: number | null;
//   threshold: number | null;
//   status: string | null;
//   alert: boolean;
//   source: string;
// }) {
//   return {
//     maturitySnapshotId: opts.maturitySnapshotId,
//     inputRoleId: opts.inputRoleId,
//     inputMetricId: opts.inputMetricId,
//     timestamp: new Date(),
//     metric: opts.metricTitle,
//     currentValue: toDec(opts.currentValue),
//     previousValue: toDec(opts.previousValue),
//     changePct: toDec(pct(opts.previousValue, opts.currentValue)),
//     threshold: toDec(opts.threshold),
//     status: opts.status,
//     alert: opts.alert,
//     source: opts.source,
//     notes: null,
//   } as const;
// }
// function pegStatus(usd: number | null, thr: number | null): string | null {
//   if (usd == null || thr == null) return null;
//   return Math.abs(usd - 1) <= thr ? 'âœ…' : 'âš ï¸';
// }
// function pegAlert(usd: number | null, thr: number | null): boolean {
//   if (usd == null || thr == null) return false;
//   return Math.abs(usd - 1) > thr;
// }
// function overThreshold(valuePct: number | null, thrPct: number | null): boolean {
//   if (valuePct == null || thrPct == null) return false;
//   return valuePct > thrPct;
}


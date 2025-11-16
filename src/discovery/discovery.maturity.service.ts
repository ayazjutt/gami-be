import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { DoscoveryInputService } from './doscovery.input.service';
import { DiscoveryPtTrackingService } from './discovery.pt-tracking.service';
import { DiscoveryYtTrackingService } from './discovery.yt-tracking.service';
import { DiscoveryLpPoolsService } from './discovery.lp-pools.service';
import { DiscoveryOutputsService } from './discovery.outputs.service';

type MetricDef = { key: string; title: string };
type AssetFound = {
  name: string;
  network: string; // 'base' | 'mainnet' | 'hyperevm' | 'avalanche'
  chain: string;
  chainId: number;
  address: string;  // pool address
  symbol: string;
};

@Injectable()
export class DiscoveryMaturityService {
  private readonly logger = new Logger(DiscoveryMaturityService.name);

  readonly inputSnapshotMetrics: MetricDef[] = [
    { key: 'apy', title: 'APY' },
    { key: 'peg_stability', title: 'Peg Stability' },
    { key: 'liquidity_depth', title: 'Liquidity Depth' },
    { key: 'gas_price', title: 'Gas Price (Gwei)' },
    { key: 'pt_price', title: 'PT-ASSET Price' },
    { key: 'pt_fair_value', title: 'PT-ASSET Fair Value' },
    { key: 'yt_price', title: 'YT-ASSET Price' },
    { key: 'yt_accumulated', title: 'YT ASSET Accumulated' },
  ];

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
    @Inject(forwardRef(() => DoscoveryInputService))
    private readonly inputs: DoscoveryInputService,
    @Inject(forwardRef(() => DiscoveryPtTrackingService))
    private readonly ptTracking: DiscoveryPtTrackingService,
    @Inject(forwardRef(() => DiscoveryYtTrackingService))
    private readonly ytTracking: DiscoveryYtTrackingService,
    @Inject(forwardRef(() => DiscoveryLpPoolsService))
    private readonly lpPools: DiscoveryLpPoolsService,
    @Inject(forwardRef(() => DiscoveryOutputsService))
    private readonly outputs: DiscoveryOutputsService,
  ) {}

  async runOnce(): Promise<void> {
    await await this.processMetavault();
    // for (const asset of this.assetsFound) {
    //   try {
    //     await this.processAsset(asset);
    //   } catch (err: any) {
    //     this.logger.error(`âŒ ${asset.network}:${asset.address} â†’ ${err?.message ?? err}`);
    //   }
    // }

    // process snapshot metrics
    await this.inputs.calc();
    // process PT tracking metrics (same pattern as inputs)
    await this.ptTracking.calc();
    // process YT tracking metrics
    await this.ytTracking.calc();
    // process LP Pools metrics
    await this.lpPools.calc();
    // process Output snapshot metrics
    await this.outputs.calc();

    const maturities = await this.getLatestMaturities();
    // console.log(maturities[0].maturity);
  }

  async processMetavault(): Promise<void> {
    const network = await this.prisma.network.upsert({
      where: { slug: 'base' },
      update: { name: 'Base', chainId: 8453 },
      create: { name: 'Base', slug: 'base', chainId: 8453 },
    });

    const url = `${this.baseUrl}/base/portfolio/0x23e0276fd738fa07284b218260d9f4113d3840b7`;
    this.logger.log(`Fetching ${url}`);
    const { data } = await firstValueFrom(this.http.get<PortfolioItem[]>(url));
    if (!Array.isArray(data)) return;

    const seen = new Set<string>();
    for (const item of data) {
      const ptAddress = lcStrict(item.address, 'portfolioItem.address');
      seen.add(ptAddress);

      const asset = await this.prisma.asset.upsert({
        where: { networkId_address: { networkId: network.id, address: ptAddress } },
        update: {
          name: item.name,
          symbol: item.ibt?.symbol ?? item.symbol,
          decimals: item.decimals ?? 18,
          isRemoved: false,
        },
        create: {
          networkId: network.id,
          address: ptAddress,
          name: item.name,
          symbol: item.ibt?.symbol ?? item.symbol,
          decimals: item.decimals ?? 18,
          isRemoved: false,
        },
      });

      await this.prisma.maturitySnapshot.create({
        data: {
          assetId: asset.id,
          maturityTs: unixToDate(item.maturity),
          source: 'Spectra Portfolio API',
          name: item.name,
          symbol: item.ibt?.symbol ?? item.symbol,
          ibtAddress: lc(item.ibt?.address),
          ytAddress: lc(item.yt?.address),
          ptAddress,
          maturityCreatedAt: item.createdAt ? unixToDate(item.createdAt) : null,
          balance: item.balance != null ? String(item.balance) : null,
          pools: (item.pools ?? []) as any,
          payload: (item as any),
        },
      });
    }

    if (seen.size > 0) {
      await this.prisma.asset.updateMany({
        where: { networkId: network.id, address: { notIn: Array.from(seen) } },
        data: { isRemoved: true },
      });
    }
  }

   async processAsset(
     asset: AssetFound,
   ) {
    // 1) Ensure network exists
    const network = await this.prisma.network.upsert({
      where: { slug: asset.network },
      update: { name: capitalize(asset.network), chainId: asset.chainId || null },
      create: { name: capitalize(asset.network), slug: asset.network, chainId: asset.chainId || null },
    });

    // 2) Fetch Spectra portfolio for the pool
    const url = `${this.baseUrl}/${asset.network}/portfolio/${asset.address}`;
    this.logger.log(`Fetching ${url}`);
    const { data } = await firstValueFrom(this.http.get<PortfolioItem[]>(url));
    if (!Array.isArray(data)) return;

    // 3) Upsert assets for each returned PT, capture seen addresses
    const seen = new Set<string>();
    for (const item of data) {
      const ptAddress = lcStrict(item.address, 'portfolioItem.address');
      seen.add(ptAddress);

      const a = await this.prisma.asset.upsert({
        where: { networkId_address: { networkId: network.id, address: ptAddress } },
        update: {
          name: item.name ?? asset.name,
          symbol: item.ibt?.symbol ?? asset.symbol,
          decimals: item.decimals ?? 18,
          isRemoved: false,
        },
        create: {
          networkId: network.id,
          address: ptAddress,
          name: item.name ?? asset.name,
          symbol: item.ibt?.symbol ?? asset.symbol,
          decimals: item.decimals ?? 18,
          isRemoved: false,
        },
      });

      // 4) Create maturity snapshot (append-only)
      await this.prisma.maturitySnapshot.create({
        data: {
          assetId: a.id,
          maturityTs: unixToDate(item.maturity),
          source: 'Spectra Portfolio API',
          name: item.name,
          symbol: item.ibt?.symbol ?? asset.symbol,
          ibtAddress: lc(item.ibt?.address),
          ytAddress: lc(item.yt?.address),
          ptAddress,
          maturityCreatedAt: item.createdAt ? unixToDate(item.createdAt) : null,
          balance: item.balance != null ? String(item.balance) : null,
          pools: (item.pools ?? []) as any,
          payload: (item as any),
        },
      });
    }

    // 5) Mark assets for this network missing from latest fetch as removed
    if (seen.size > 0) {
      await this.prisma.asset.updateMany({
        where: { networkId: network.id, address: { notIn: Array.from(seen) } },
        data: { isRemoved: true },
      });
    }
    
   }

  /** Returns latest maturity snapshot per asset (by createdAt desc) */
  async getLatestMaturities() {
    const rows = await this.prisma.maturitySnapshot.findMany({
      where: { asset: { isRemoved: false } },
      orderBy: { createdAt: 'desc' },
      include: { asset: true },
    });
    const seen = new Set<number>();
    const latest: typeof rows = [];
    for (const r of rows) {
      if (!seen.has(r.assetId)) {
        seen.add(r.assetId);
        latest.push(r);
      }
    }
    const results = await Promise.all(
      latest.map(async (r) => ({
        asset: {
          id: r.asset.id,
          address: r.asset.address,
          name: r.asset.name,
          symbol: r.asset.symbol,
          isRemoved: r.asset.isRemoved,
        },
        maturity: {
          id: r.id,
          assetId: r.assetId,
          maturityTs: r.maturityTs,
          createdAt: r.createdAt,
          ptAddress: r.ptAddress,
          ytAddress: r.ytAddress,
          ibtAddress: r.ibtAddress,
          symbol: r.symbol,
          name: r.name,
          payload: r.payload,
          inputSnapshot: await this.getInputSnapshotsForMaturity(r.id),
          ptTracking: await this.getPtTrackingSnapshotsForMaturity(r.id),
          ytTracking: await this.getYtTrackingSnapshotsForMaturity(r.id),
        },
      }))
    );
    return results;
  }

  private async getInputSnapshotsForMaturity(maturitySnapshotId: number) {
    return this.prisma.inputSnapshot.findMany({
      where: { maturitySnapshotId },
      orderBy: [{ metric: 'asc' }, { createdAt: 'desc' }],
    });
  }

  private async getPtTrackingSnapshotsForMaturity(maturitySnapshotId: number) {
    return (this.prisma as any).ptTrackingSnapshot.findMany({
      where: { maturitySnapshotId },
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  private async getYtTrackingSnapshotsForMaturity(maturitySnapshotId: number) {
    return (this.prisma as any).ytTrackingSnapshot.findMany({
      where: { maturitySnapshotId },
      orderBy: [{ createdAt: 'desc' }],
    });
  }

}


// -------- Helpers & Types --------
type BigNumberish = string | number;

type SpectraPool = {
  address: string;
  chainId: number;
  lpt?: { address: string; decimals: number; chainId: number; supply?: BigNumberish; price?: { underlying?: number; usd?: number } };
  liquidity?: { underlying?: number; usd?: number };
  ptApy?: number;
  ytLeverage?: number;
  impliedApy?: number;
  lpApy?: { total?: number; details?: Record<string, any>; boostedTotal?: number };
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
  address: string; // PT
  name: string;
  symbol: string;
  decimals: number;
  chainId: number;
  maturity: number; // unix seconds
  createdAt: number; // unix seconds
  yt?: { address: string; decimals: number; chainId: number };
  ibt?: { address: string; name: string; symbol: string; decimals: number; chainId: number; rate?: BigNumberish; spotRate?: BigNumberish };
  pools?: SpectraPool[];
  maturityValue?: { underlying?: number; usd?: number };
  balance?: BigNumberish;
  [k: string]: any;
};

function lc(v?: string | null): string | null {
  return v ? v.toLowerCase() : null;
}

function lcStrict(v?: string | null, field?: string): string {
  if (!v) throw new Error(`Expected string for ${field ?? 'value'}`);
  return v.toLowerCase();
}

function unixToDate(sec?: number | null): Date {
  const s = Number(sec ?? 0);
  return new Date(s * 1000);
}

function capitalize(v: string): string {
  return v ? v.charAt(0).toUpperCase() + v.slice(1) : v;
}

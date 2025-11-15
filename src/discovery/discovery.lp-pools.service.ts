import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { DiscoveryMaturityService } from './discovery.maturity.service';

@Injectable()
export class DiscoveryLpPoolsService {
  private readonly logger = new Logger(DiscoveryLpPoolsService.name);
  private readonly SPECTRA_SUBGRAPH_URL =
    'https://subgraph.satsuma-prod.com/93c7f5423489/perspective/spectra-base/api';

  constructor(
    @Inject(forwardRef(() => DiscoveryMaturityService))
    private readonly maturity: DiscoveryMaturityService,
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
  ) {}

  async calc() {
    const maturities = await this.maturity.getLatestMaturities();
    this.logger.log(`LP Pools: fetched ${maturities.length} maturities`);

    for (const m of maturities) {
      const maturitySnapshotId: number | null = m?.maturity?.id ?? null;
      if (!maturitySnapshotId) continue;

      const payload = m?.maturity?.payload ?? null;
      const pools: any[] = Array.isArray((payload as any)?.pools) ? (payload as any).pools : [];

      const volume24h = await this.getPool24hVolumeUsd(payload);
      console.log('volume24h', volume24h);

      const toNum = (v: any): number | null => {
        if (v == null) return null;
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
      };

      // Per request: TVL from payload.tvl.ibt, APY from pools[0].lpApy.total
      const tvl = toNum((payload as any)?.tvl?.ibt) ?? toNum(pools?.[0]?.liquidity?.underlying);
      const apy = toNum(pools?.[0]?.lpApy?.total);

      // Placeholders for fields not currently derived
      const ourAllocation: number | null = this.calcOurAllocationUsd(payload, pools);
      const ourSharePct: number | null =
        ourAllocation != null && tvl != null && tvl !== 0 ? ourAllocation / tvl : null;
      const dailyFees: number | null =
        ourAllocation != null && apy != null ? (ourAllocation * apy) / 365 : null;
      const liquidityHealth: number | null =
        volume24h != null && tvl != null && tvl !== 0 ? volume24h / tvl : null;
      const efficiencyScore: number | null =
        apy != null && dailyFees != null ? (apy + dailyFees) / 0.015 : null;
      // Get target allocation from Asset.lpPoolTargetAllocation (nullable)
      let targetAllocation: number | null = null;
      try {
        const assetId: number | null = (m as any)?.asset?.id ?? null;
        if (assetId) {
          const asset = await this.prisma.asset.findUnique({
            where: { id: assetId },
            select: { lpPoolTargetAllocation: true },
          });
          const raw = (asset as any)?.lpPoolTargetAllocation;
          const val = raw != null ? Number(raw) : null;
          targetAllocation = Number.isFinite(val as number) ? (val as number) : null;
        }
      } catch (e) {
        // keep as null on any failure
      }
      const rebalanceSignal: 'REBALANCE' | 'HOLD' | null =
        ourAllocation != null && targetAllocation != null && targetAllocation !== 0
          ? Math.abs(ourAllocation - targetAllocation) / Math.abs(targetAllocation) > 0
            ? 'REBALANCE'
            : 'HOLD'
          : null;

      try {
        await (this.prisma as any).lpPoolSnapshot.upsert({
          where: { maturitySnapshotId },
          update: {
            tvl: tvl != null ? String(tvl) : null,
            apy: apy != null ? String(apy) : null,
            volume24h: volume24h != null ? String(volume24h) : null,
            ourAllocation: ourAllocation != null ? String(ourAllocation) : null,
            ourSharePct: ourSharePct != null ? String(ourSharePct) : null,
            dailyFees: dailyFees != null ? String(dailyFees) : null,
            liquidityHealth: liquidityHealth != null ? String(liquidityHealth) : null,
            efficiencyScore: efficiencyScore != null ? String(efficiencyScore) : null,
            targetAllocation: targetAllocation != null ? String(targetAllocation) : null,
            rebalanceSignal: rebalanceSignal ?? null,
          },
          create: {
            maturitySnapshotId,
            tvl: tvl != null ? String(tvl) : null,
            apy: apy != null ? String(apy) : null,
            volume24h: volume24h != null ? String(volume24h) : null,
            ourAllocation: ourAllocation != null ? String(ourAllocation) : null,
            ourSharePct: ourSharePct != null ? String(ourSharePct) : null,
            dailyFees: dailyFees != null ? String(dailyFees) : null,
            liquidityHealth: liquidityHealth != null ? String(liquidityHealth) : null,
            efficiencyScore: efficiencyScore != null ? String(efficiencyScore) : null,
            targetAllocation: targetAllocation != null ? String(targetAllocation) : null,
            rebalanceSignal: rebalanceSignal ?? null,
          },
        });
      } catch (err) {
        this.logger.error('Failed to upsert LpPoolSnapshot');
      }
    }

    return maturities;
  }

  async getPool24hVolumeUsd(pool: any): Promise<number> {
    // lowercase pool address from Spectra Pools API
    const poolAddress = pool.pools[0].address.toLowerCase();
    const underlyingDecimals = pool.underlying.decimals;
    const underlyingPriceUsd = pool.underlying.price.usd;

    // 24h window
    const since = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000);
    const span = 3600; // 1h buckets

    const query = `
    query Pool24hVolume($pool: String!, $since: Int!, $span: Int!) {
      poolStats_collection(
        where: { pool: $pool, timestamp_gte: $since, span: $span }
        orderBy: timestamp
        orderDirection: asc
      ) {
        buyVolume
        sellVolume
      }
    }
  `;

    const variables = { pool: poolAddress, since, span };

    // call the Spectra subgraph
    const resp = await lastValueFrom(
      this.httpService.post(this.SPECTRA_SUBGRAPH_URL, { query, variables }),
    );

    // retrieve array from poolStats_collection
    const stats = resp.data?.data?.poolStats_collection ?? [];
    // console.log('Pool 24h stats:', stats);

    // sum buy & sell volumes (strings -> numbers)
    const rawVolume = stats.reduce((sum: number, s: any) => {
      const buy = Number(s.buyVolume ?? '0');
      const sell = Number(s.sellVolume ?? '0');
      return sum + buy + sell;
    }, 0);

    // convert to underlying token amount and then to USD
    const volumeUnderlying = rawVolume / 10 ** underlyingDecimals;
    const volumeUsd = volumeUnderlying * underlyingPriceUsd;

    return volumeUsd;
  }

  private calcOurAllocationUsd(payload: any, pools: any[]): number | null {
    if (!payload || !Array.isArray(pools) || pools.length === 0) return null;
    const balance = Number((payload as any)?.balance);
    const decimals = Number((payload as any)?.decimals);
    const ptPriceUsd = Number((pools as any)?.[0]?.ptPrice?.usd);

    if (!Number.isFinite(balance) || !Number.isFinite(decimals) || !Number.isFinite(ptPriceUsd)) return null;
    const denom = 10 ** decimals;
    if (!Number.isFinite(denom) || denom === 0) return null;

    return (balance / denom) * ptPriceUsd;
  }
}

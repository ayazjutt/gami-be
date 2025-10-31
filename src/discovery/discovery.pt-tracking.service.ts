import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { DiscoveryMaturityService } from './discovery.maturity.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DiscoveryPtTrackingService {
  private readonly logger = new Logger(DiscoveryPtTrackingService.name);

  constructor(
    @Inject(forwardRef(() => DiscoveryMaturityService))
    private readonly maturity: DiscoveryMaturityService,
    private readonly prisma: PrismaService,
  ) {}

  async calc() {
    const maturities = await this.maturity.getLatestMaturities();
    this.logger.log(`PT Tracking: fetched ${maturities.length} maturities`);

    for (const m of maturities) {
      const snapshots = Array.isArray(m?.maturity?.inputSnapshot) ? m.maturity.inputSnapshot : [];
      const findMetric = (key: string) => snapshots.find((x: any) => x?.metric === key);
      const toNum = (v: any): number | null => {
        if (v == null) return null;
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
      };

      const marketPrice = toNum(findMetric('pt_price')?.currentValue);
      const fairValue = toNum(findMetric('pt_fair_value')?.currentValue);
      const tvl = toNum(findMetric('liquidity_depth')?.currentValue);

      const mispricingPct = marketPrice != null && fairValue != null && fairValue !== 0
        ? (marketPrice - fairValue) / fairValue
        : null;

      const impliedApy = marketPrice != null && marketPrice > 0
        ? Math.pow(1 / marketPrice, 365 / 90) - 1
        : null;

      const manualFactor = 1.0;
      const volume24hForLiquidity = 600000; // as requested for Liquidity Score calc
      const liquidityScore = tvl != null && tvl > 0
        ? (volume24hForLiquidity / tvl) * manualFactor * 10
        : null;

      const bidAskSpread = 0.003; // hardcoded
      const volume24h = 85000; // hardcoded

      const threshold = 0.02;
      let signal: 'HOLD' | 'BUY' = 'HOLD';
      if (mispricingPct != null && Math.abs(mispricingPct) > threshold) {
        // Original spec suggested SELL/BUY/HOLD, but enum only supports HOLD/BUY.
        // Use BUY when underpriced (negative mispricing), else HOLD.
        signal = mispricingPct < 0 ? 'BUY' : 'HOLD';
      }

      const maturitySnapshotId: number | null = m?.maturity?.id ?? null;
      if (!maturitySnapshotId) continue;

      await (this.prisma as any).ptTrackingSnapshot.upsert({
        where: { maturitySnapshotId },
        update: {
          marketPrice: marketPrice != null ? String(marketPrice) : null,
          fairValue: fairValue != null ? String(fairValue) : null,
          mispricingPct: mispricingPct != null ? String(mispricingPct) : null,
          impliedApy: impliedApy != null ? String(impliedApy) : null,
          liquidityScore: liquidityScore != null ? String(liquidityScore) : null,
          bidAskSpread: String(bidAskSpread),
          volume24h: String(volume24h),
          arbitrageSignal: signal,
          action: signal,
        },
        create: {
          maturitySnapshotId,
          marketPrice: marketPrice != null ? String(marketPrice) : null,
          fairValue: fairValue != null ? String(fairValue) : null,
          mispricingPct: mispricingPct != null ? String(mispricingPct) : null,
          impliedApy: impliedApy != null ? String(impliedApy) : null,
          liquidityScore: liquidityScore != null ? String(liquidityScore) : null,
          bidAskSpread: String(bidAskSpread),
          volume24h: String(volume24h),
          arbitrageSignal: signal,
          action: signal,
        },
      });
    }
    return maturities;
  }
}

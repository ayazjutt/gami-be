import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { DiscoveryMaturityService } from './discovery.maturity.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DiscoveryYtTrackingService {
  private readonly logger = new Logger(DiscoveryYtTrackingService.name);

  constructor(
    @Inject(forwardRef(() => DiscoveryMaturityService))
    private readonly maturity: DiscoveryMaturityService,
    private readonly prisma: PrismaService,
  ) {}

  async calc() {
    const maturities = await this.maturity.getLatestMaturities();
    this.logger.log(`YT Tracking: fetched ${maturities.length} maturities`);

    for (const m of maturities) {
      const snapshots = Array.isArray(m?.maturity?.inputSnapshot) ? m.maturity.inputSnapshot : [];
      const findMetric = (key: string) => snapshots.find((x: any) => x?.metric === key);
      const toNum = (v: any): number | null => {
        if (v == null) return null;
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
      };

      // 1. Market Price (YT)
      const ytMarketPrice = toNum(findMetric('yt_price')?.currentValue);

      // 2. impliedApy = (1 / ytPrice) ** (365 / daysToMaturity) - 1
      const maturityTs: Date | null = m?.maturity?.maturityTs ?? null;
      const now = new Date();
      const msPerDay = 1000 * 60 * 60 * 24;
      const daysToMaturity = maturityTs ? Math.max(0, (maturityTs.getTime() - now.getTime()) / msPerDay) : null;
      const impliedApy = ytMarketPrice != null && ytMarketPrice > 0 && daysToMaturity != null && daysToMaturity > 0
        ? Math.pow(1 / ytMarketPrice, 365 / daysToMaturity) - 1
        : null;
      const impliedApyPct = impliedApy != null ? impliedApy * 100 : null; // as percentage

      // 3. Accumulated Yield
      const accumulatedYield = toNum(findMetric('yt_accumulated')?.currentValue);

      // 4. Harvest Threshold (hardcoded)
      const harvestThreshold = 500;

      // 5. Days Since Harvest (random lastHarvestDate per maturity)
      const maturityId: number | null = m?.maturity?.id ?? null;
      const randSeed = (maturityId ?? Math.floor(Math.random() * 1e6)) % 97;
      const randomDaysAgo = 1 + (randSeed % 30); // 1..30 days ago
      const lastHarvestDate = new Date(now.getTime() - randomDaysAgo * msPerDay);
      const daysSinceHarvest = Math.floor((now.getTime() - lastHarvestDate.getTime()) / msPerDay);

      // 6. Daily Yield Est and Action (string per request)
      const condition = (accumulatedYield ?? 0) > harvestThreshold;
      const dailyYieldEst: 'HARVEST' | 'WAIT' = condition ? 'HARVEST' : 'WAIT';
      const action: 'HARVEST' | 'WAIT' = dailyYieldEst;

      // 7. Gas Cost Est (hardcoded)
      const gasCostEst = 25;

      // 8. Net Value
      const netValue = (accumulatedYield ?? 0) - gasCostEst;

      // Optional: log per maturity (kept lightweight)
      this.logger.log(
        `YT id=${maturityId} price=${ytMarketPrice} apy%=${impliedApyPct} acc=${accumulatedYield} thr=${harvestThreshold} daysSince=${daysSinceHarvest} action=${action} gas=${gasCostEst} net=${netValue}`,
      );

      // Persist/update YT tracking snapshot for this maturity (per call)
      try {
        const maturitySnapshotId: number | null = m?.maturity?.id ?? null;
        if (!maturitySnapshotId) continue;

        const harvestSignal: 'CLAIM' | 'WAIT' = (accumulatedYield ?? 0) > harvestThreshold ? 'CLAIM' : 'WAIT';
        const dailyYieldEstEnum: 'HARVEST' | 'WAIT' = dailyYieldEst;
        const actionEnum: 'CLAIM' | 'WAIT' = action === 'HARVEST' ? 'CLAIM' : 'WAIT';

        await (this.prisma as any).ytTrackingSnapshot.upsert({
          where: { maturitySnapshotId },
          update: {
            marketPrice: ytMarketPrice != null ? String(ytMarketPrice) : null,
            impliedApy: impliedApy != null ? String(impliedApy) : null,
            accumulatedYield: accumulatedYield != null ? String(accumulatedYield) : null,
            harvestThreshold: String(harvestThreshold),
            daysSinceHarvest: daysSinceHarvest,
            dailyYieldEst: dailyYieldEstEnum,
            harvestSignal: harvestSignal,
            gasCostEst: String(gasCostEst),
            netValue: String(netValue),
            action: actionEnum,
          },
          create: {
            maturitySnapshotId,
            marketPrice: ytMarketPrice != null ? String(ytMarketPrice) : null,
            impliedApy: impliedApy != null ? String(impliedApy) : null,
            accumulatedYield: accumulatedYield != null ? String(accumulatedYield) : null,
            harvestThreshold: String(harvestThreshold),
            daysSinceHarvest: daysSinceHarvest,
            dailyYieldEst: dailyYieldEstEnum,
            harvestSignal: harvestSignal,
            gasCostEst: String(gasCostEst),
            netValue: String(netValue),
            action: actionEnum,
          },
        });
      } catch (err) {
        this.logger.error('Failed to upsert YtTrackingSnapshot');
      }
    }

    return maturities;
  }
}

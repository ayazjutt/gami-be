import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { DiscoveryMaturityService } from './discovery.maturity.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DoscoveryInputService {
  private readonly logger = new Logger(DoscoveryInputService.name);

  constructor(
    @Inject(forwardRef(() => DiscoveryMaturityService))
    private readonly maturity: DiscoveryMaturityService,
    private readonly prisma: PrismaService,
  ) {}

  async calc() {
    // Fetch latest maturity snapshots per asset
    const maturities = await this.maturity.getLatestMaturities();
// console.log((maturities));
    for (const m of maturities) {
      console.log((m));
      const apy = await this.calculateApy(m);
      await this.calculatePegStability(m);
      await this.calculateLiquidityDepth(m);
      await this.calculateGasPrice(m);
      await this.calculatePtPrice(m);
      await this.calculatePtFairValue(m, apy);
      await this.calculateYtPrice(m);
      await this.calculateYtAccumulated(m);
    }

    
    return maturities;
  }

  
  private async calculateApy(maturityItem: any) {
    const payload = maturityItem?.maturity?.payload ?? null;
    const pools: any[] = Array.isArray(payload?.pools) ? payload.pools : [];
    if (!pools.length) return null;

    
    // Compute APY using tvl.ibt-weighted impliedApy across pools
    // Formula: assetApy = Sum(tvl.ibt * impliedApy) / Sum(tvl.ibt)
    // If only one pool exists, assetApy = that pool's impliedApy
    let apy = 0;
    if (pools.length === 1) {
      apy = Number(pools[0]?.impliedApy);
      apy =  Number.isFinite(apy) ? apy : 0;
    } else {
      let weightedSum = 0;
      let totalWeight = 0;
      for (const p of pools) {
        const apy = Number(p?.impliedApy);
        const weight = Number(p?.tvl?.ibt);
        if (!Number.isFinite(apy) || !Number.isFinite(weight) || weight <= 0) continue;
        weightedSum += weight * apy;
        totalWeight += weight;
      }

      apy = weightedSum / totalWeight;
      apy =  Number.isFinite(apy) ? apy : 0;
    }

    // Fetch the second last InputSnapshot.currentValue for this asset + metric
    let previousValue = 0;
    try {
      const assetId = maturityItem?.maturity?.assetId;
      // Get the second latest maturitySnapshotId for this asset, then fetch previous value by that ID
      const metricTitle = 'apy';
      if (assetId) {
        const secondLatestMaturity = await this.prisma.maturitySnapshot.findMany({
          where: { assetId },
          orderBy: { createdAt: 'desc' },
          select: { id: true },
          skip: 1,
          take: 1,
        });
        const secondLatestId = secondLatestMaturity[0]?.id;
        console.log(`secondLatestId:: ${secondLatestId}`)
        if (secondLatestId) {
          const prev = await this.prisma.inputSnapshot.findFirst({
            where: { metric: metricTitle, maturitySnapshotId: secondLatestId },
            orderBy: { createdAt: 'desc' },
            select: { currentValue: true },
          });
          if (prev?.currentValue != null) {
            previousValue = Number((prev as any).currentValue);
          }
        }
      }
    } catch {}
    const changePercentage = (apy - previousValue) / previousValue;
    const threshold = 0.005;
    const status = Math.abs(changePercentage) > threshold ? '\u26A0\uFE0F' : '\u2705';
    const alert = status === '\u26A0\uFE0F' ? 1 : 0;
    const source = 'Spectra API';
    const note = null;
    const metric = 'apy';

    // Insert record into InputSnapshot using computed values
    try {
      const maturitySnapshotId = maturityItem?.maturity?.id;
      if (maturitySnapshotId && this.prisma) {
        await this.prisma.inputSnapshot.create({
          data: {
            maturitySnapshotId,
            metric,
            currentValue: apy,
            previousValue,
            changePercentage,
            threshold,
            status,
            alert: Boolean(alert),
            source,
            note,
          },
        });
      }
    } catch (err) {
      this.logger.error('Failed to insert InputSnapshot');
    }
    console.log({ apy, previousValue, changePercentage, threshold, status, alert });
    return apy;
  }

  // Peg Stability=(underlying.price.usd/1.0)×100
  private async calculatePegStability(maturityItem: any) {
    const payload = maturityItem?.maturity?.payload ?? null;
    const usd = Number(payload?.underlying?.price?.usd);
    const peg = Number.isFinite(usd) ? usd * 100 : 0;

    let previousValue = 0;
    try {
      const assetId = maturityItem?.maturity?.assetId;
      const metricTitle = 'peg_stability';
      if (assetId) {
        const secondLatestMaturity = await this.prisma.maturitySnapshot.findMany({
          where: { assetId },
          orderBy: { createdAt: 'desc' },
          select: { id: true },
          skip: 1,
          take: 1,
        });
        const secondLatestId = secondLatestMaturity[0]?.id;
        if (secondLatestId) {
          const prev = await this.prisma.inputSnapshot.findFirst({
            where: { metric: metricTitle, maturitySnapshotId: secondLatestId },
            orderBy: { createdAt: 'desc' },
            select: { currentValue: true },
          });
          if (prev?.currentValue != null) {
            previousValue = Number((prev as any).currentValue);
          }
        }
      }
    } catch {}

    const changePercentage = (peg - previousValue) / previousValue;
    const threshold = 0.005;
    const status = Math.abs(changePercentage) > threshold ? '\u26A0\uFE0F' : '\u2705';
    const alert = status === '\u26A0\uFE0F' ? 1 : 0;
    const source = 'Spectra API';
    const note = null;
    const metric = 'peg_stability';

    try {
      const maturitySnapshotId = maturityItem?.maturity?.id;
      if (maturitySnapshotId && this.prisma) {
        await this.prisma.inputSnapshot.create({
          data: {
            maturitySnapshotId,
            metric,
            currentValue: peg,
            previousValue,
            changePercentage,
            threshold,
            status,
            alert: Boolean(alert),
            source,
            note,
          },
        });
      }
    } catch (err) {
      this.logger.error('Failed to insert InputSnapshot (Peg Stability)');
    }
  }

  // Liquidity Depth = pools[0].liquidity.underlying
  private async calculateLiquidityDepth(maturityItem: any) {
    const payload = maturityItem?.maturity?.payload ?? null;
    const pools: any[] = Array.isArray(payload?.pools) ? payload.pools : [];
    if (!pools.length) return null;

    const liquidityDepth = Number(pools[0]?.liquidity?.underlying) || 0;

    let previousValue = 0;
    try {
      const assetId = maturityItem?.maturity?.assetId;
      const metricTitle = 'liquidity_depth';
      if (assetId) {
        const secondLatestMaturity = await this.prisma.maturitySnapshot.findMany({
          where: { assetId },
          orderBy: { createdAt: 'desc' },
          select: { id: true },
          skip: 1,
          take: 1,
        });
        const secondLatestId = secondLatestMaturity[0]?.id;
        if (secondLatestId) {
          const prev = await this.prisma.inputSnapshot.findFirst({
            where: { metric: metricTitle, maturitySnapshotId: secondLatestId },
            orderBy: { createdAt: 'desc' },
            select: { currentValue: true },
          });
          if (prev?.currentValue != null) {
            previousValue = Number((prev as any).currentValue);
          }
        }
      }
    } catch {}

    const changePercentage = (liquidityDepth - previousValue) / previousValue;
    const threshold = 0.05;
    const status = Math.abs(changePercentage) > threshold ? '\u26A0\uFE0F' : '\u2705';
    const alert = status === '\u26A0\uFE0F' ? 1 : 0;
    const source = 'Spectra API';
    const note = null;
    const metric = 'liquidity_depth';

    try {
      const maturitySnapshotId = maturityItem?.maturity?.id;
      if (maturitySnapshotId && this.prisma) {
        await this.prisma.inputSnapshot.create({
          data: {
            maturitySnapshotId,
            metric,
            currentValue: liquidityDepth,
            previousValue,
            changePercentage,
            threshold,
            status,
            alert: Boolean(alert),
            source,
            note,
          },
        });
      }
    } catch (err) {
      this.logger.error('Failed to insert InputSnapshot (Liquidity Depth)');
    }
  }

  private async calculateGasPrice(_maturityItem: any) {}

  // YT Price = pools[0].ytPrice.underlying
  private async calculateYtPrice(maturityItem: any) {
    const payload = maturityItem?.maturity?.payload ?? null;
    const pools: any[] = Array.isArray(payload?.pools) ? payload.pools : [];
    if (!pools.length) return null;

    const ytPrice = Number(pools[0]?.ytPrice?.underlying) || 0;

    let previousValue = 0;
    try {
      const assetId = maturityItem?.maturity?.assetId;
      const metricTitle = 'yt_price';
      if (assetId) {
        const secondLatestMaturity = await this.prisma.maturitySnapshot.findMany({
          where: { assetId },
          orderBy: { createdAt: 'desc' },
          select: { id: true },
          skip: 1,
          take: 1,
        });
        const secondLatestId = secondLatestMaturity[0]?.id;
        if (secondLatestId) {
          const prev = await this.prisma.inputSnapshot.findFirst({
            where: { metric: metricTitle, maturitySnapshotId: secondLatestId },
            orderBy: { createdAt: 'desc' },
            select: { currentValue: true },
          });
          if (prev?.currentValue != null) {
            previousValue = Number((prev as any).currentValue);
          }
        }
      }
    } catch {}

    const changePercentage = (ytPrice - previousValue) / previousValue;
    const threshold = 0.05;
    const status = Math.abs(changePercentage) > threshold ? '\u26A0\uFE0F' : '\u2705';
    const alert = status === '\u26A0\uFE0F' ? 1 : 0;
    const source = 'Spectra API';
    const note = null;
    const metric = 'yt_price';

    try {
      const maturitySnapshotId = maturityItem?.maturity?.id;
      if (maturitySnapshotId && this.prisma) {
        await this.prisma.inputSnapshot.create({
          data: {
            maturitySnapshotId,
            metric,
            currentValue: ytPrice,
            previousValue,
            changePercentage,
            threshold,
            status,
            alert: Boolean(alert),
            source,
            note,
          },
        });
      }
    } catch (err) {
      this.logger.error('Failed to insert InputSnapshot (YT Price)');
    }
  }

  // YT Accumulated (USD) = (balance * underlying.price.usd * impliedApy * days_since_harvest / 365) / 1e18
  /* pools[0].impliedApy": 11.195216086427306,
"balance": "352881357824430031859534",
"underlying.price.usd": 0.9998990348568948
🧮 Conceptual calculation
Accumulated (USD)=Position Value×Implied APY×Days Since Harvest​/365
here

Position Value ≈ balance × underlying.price.usd / 1e18
→ ≈ 352,881 × 0.9999 = $352,880

Implied APY = 11.195 %

Days Since Harvest = assume 30
So:

YT-3M Accumulated = ( balance × underlying.price.usd × impliedApy × days_since_harvest / 365 ) / 1e18 */
  private async calculateYtAccumulated(maturityItem: any) {
    const payload = maturityItem?.maturity?.payload ?? null;
    const pools: any[] = Array.isArray(payload?.pools) ? payload.pools : [];
    if (!pools.length) return null;

    const balanceStr = String(payload?.balance ?? '0');
    const usdPrice = Number(payload?.underlying?.price?.usd);
    const impliedApyRaw = Number(pools[0]?.impliedApy);
    const daysSinceHarvest = 30; // assumption

    const impliedApy = Number.isFinite(impliedApyRaw)
      ? (impliedApyRaw > 1 ? impliedApyRaw / 100 : impliedApyRaw)
      : 0;

    const balanceNormalized = Number(balanceStr) / 1e18;
    const positionValueUsd = (Number.isFinite(balanceNormalized) ? balanceNormalized : 0) * (Number.isFinite(usdPrice) ? usdPrice : 0);

    const ytAccumulated = positionValueUsd * impliedApy * (daysSinceHarvest / 365);

    let previousValue = 0;
    try {
      const assetId = maturityItem?.maturity?.assetId;
      const metricTitle = 'yt_accumulated';
      if (assetId) {
        const secondLatestMaturity = await this.prisma.maturitySnapshot.findMany({
          where: { assetId },
          orderBy: { createdAt: 'desc' },
          select: { id: true },
          skip: 1,
          take: 1,
        });
        const secondLatestId = secondLatestMaturity[0]?.id;
        if (secondLatestId) {
          const prev = await this.prisma.inputSnapshot.findFirst({
            where: { metric: metricTitle, maturitySnapshotId: secondLatestId },
            orderBy: { createdAt: 'desc' },
            select: { currentValue: true },
          });
          if (prev?.currentValue != null) {
            previousValue = Number((prev as any).currentValue);
          }
        }
      }
    } catch {}

    const changePercentage = (ytAccumulated - previousValue) / previousValue;
    const threshold = 500;
    const status = ytAccumulated > threshold ? '\uD83C\uDFAF' : '\u2705';
    const alert = ytAccumulated > threshold ? 1 : 0;
    const source = 'Calculated';
    const note = null;
    const metric = 'yt_accumulated';

    try {
      const maturitySnapshotId = maturityItem?.maturity?.id;
      if (maturitySnapshotId && this.prisma) {
        await this.prisma.inputSnapshot.create({
          data: {
            maturitySnapshotId,
            metric,
            currentValue: ytAccumulated,
            previousValue,
            changePercentage,
            threshold,
            status,
            alert: Boolean(alert),
            source,
            note,
          },
        });
      }
    } catch (err) {
      this.logger.error('Failed to insert InputSnapshot (YT Accumulated)');
    }
  }

  // PT Price = pools[0].ptPrice.underlying
  private async calculatePtPrice(maturityItem: any) {
    const payload = maturityItem?.maturity?.payload ?? null;
    const pools: any[] = Array.isArray(payload?.pools) ? payload.pools : [];
    if (!pools.length) return null;

    const ptPrice = Number(pools[0]?.ptPrice?.underlying) || 0;

    let previousValue = 0;
    try {
      const assetId = maturityItem?.maturity?.assetId;
      const metricTitle = 'pt_price';
      if (assetId) {
        const secondLatestMaturity = await this.prisma.maturitySnapshot.findMany({
          where: { assetId },
          orderBy: { createdAt: 'desc' },
          select: { id: true },
          skip: 1,
          take: 1,
        });
        const secondLatestId = secondLatestMaturity[0]?.id;
        if (secondLatestId) {
          const prev = await this.prisma.inputSnapshot.findFirst({
            where: { metric: metricTitle, maturitySnapshotId: secondLatestId },
            orderBy: { createdAt: 'desc' },
            select: { currentValue: true },
          });
          if (prev?.currentValue != null) {
            previousValue = Number((prev as any).currentValue);
          }
        }
      }
    } catch {}

    const changePercentage = (ptPrice - previousValue) / previousValue;
    const threshold = 0.005;
    const status = Math.abs(changePercentage) > threshold ? '\u26A0\uFE0F' : '\u2705';
    const alert = status === '\u26A0\uFE0F' ? 1 : 0;
    const source = 'Spectra API';
    const note = null;
    const metric = 'pt_price';

    try {
      const maturitySnapshotId = maturityItem?.maturity?.id;
      if (maturitySnapshotId && this.prisma) {
        await this.prisma.inputSnapshot.create({
          data: {
            maturitySnapshotId,
            metric,
            currentValue: ptPrice,
            previousValue,
            changePercentage,
            threshold,
            status,
            alert: Boolean(alert),
            source,
            note,
          },
        });
      }
    } catch (err) {
      this.logger.error('Failed to insert InputSnapshot (PT Price)');
    }
  }

  // PT Fair Value = 1 / (apy * 90 / 365)
  private async calculatePtFairValue(maturityItem: any, apyInput: any) {
    const apy = Number(apyInput);
    const denominator = apy * (90 / 365);
    const ptFairValue = Number.isFinite(denominator) && denominator > 0 ? 1 / denominator : 0;

    let previousValue = 0;
    try {
      const assetId = maturityItem?.maturity?.assetId;
      const metricTitle = 'pt_fair_value';
      if (assetId) {
        const secondLatestMaturity = await this.prisma.maturitySnapshot.findMany({
          where: { assetId },
          orderBy: { createdAt: 'desc' },
          select: { id: true },
          skip: 1,
          take: 1,
        });
        const secondLatestId = secondLatestMaturity[0]?.id;
        if (secondLatestId) {
          const prev = await this.prisma.inputSnapshot.findFirst({
            where: { metric: metricTitle, maturitySnapshotId: secondLatestId },
            orderBy: { createdAt: 'desc' },
            select: { currentValue: true },
          });
          if (prev?.currentValue != null) {
            previousValue = Number((prev as any).currentValue);
          }
        }
      }
    } catch {}

    const changePercentage = (ptFairValue - previousValue) / previousValue;
    const source = 'Calculated';
    const note = null;
    const metric = 'pt_fair_value';

    try {
      const maturitySnapshotId = maturityItem?.maturity?.id;
      if (maturitySnapshotId && this.prisma) {
        await this.prisma.inputSnapshot.create({
          data: {
            maturitySnapshotId,
            metric,
            currentValue: ptFairValue,
            previousValue,
            changePercentage,
            threshold: null,
            status: null,
            alert: null,
            source,
            note,
          },
        });
      }
    } catch (err) {
      this.logger.error('Failed to insert InputSnapshot (PT Fair Value)');
    }
  }

}

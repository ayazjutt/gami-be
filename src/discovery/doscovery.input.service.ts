import { Injectable, Logger, Inject, forwardRef, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import type { AxiosResponse } from 'axios';
import { DiscoveryMaturityService } from './discovery.maturity.service';
import { PrismaService } from '../prisma/prisma.service';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class DoscoveryInputService {
  private readonly logger = new Logger(DoscoveryInputService.name);
  private readonly INFURA_KEY = '96b3ed4cf8e640f2a23db8bc892325dc';
  // private readonly URL = `https://gas.api.infura.io/v3/${this.INFURA_KEY}/networks/base/gas-prices`;

private readonly GAS_API_URL =
  'https://gas.api.infura.io/v3/96b3ed4cf8e640f2a23db8bc892325dc/networks/8453/suggestedGasFees';

  constructor(
    @Inject(forwardRef(() => DiscoveryMaturityService))
    private readonly maturity: DiscoveryMaturityService,
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
  ) {}

  async calc() {
    // const lastHarvest = await this.getLastHarvestDate(
    //   '0x23e0276fd738fa07284b218260d9f4113d3840b7',
    // );
    // console.log(lastHarvest);

    // Fetch latest maturity snapshots per asset
    const maturities = await this.maturity.getLatestMaturities();

    for (const m of maturities) {
      const apy = await this.calculateApy(m);
      await this.calculatePegStability(m);
      await this.calculateLiquidityDepth(m);
      const gas = await this.calculateGasPrice(m);
      console.log(gas)
      await this.calculatePtPrice(m);
      await this.calculatePtFairValue(m, apy);
      await this.calculateYtPrice(m);
      await this.calculateYtAccumulated(m);
    }

    // const ms = await this.maturity.getLatestMaturities();
    // console.log((ms));

    
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
    // Fetch threshold from Asset.apyThreshold; if null, keep it null
    let threshold: number | null = null;
    try {
      const assetId = maturityItem?.maturity?.assetId;
      if (assetId) {
        const asset = await this.prisma.asset.findUnique({
          where: { id: assetId },
          select: { apyThreshold: true },
        });
        if (asset?.apyThreshold != null) {
          const t = Number(asset.apyThreshold as any);
          threshold = Number.isFinite(t) ? t : null;
        }
      }
    } catch {}
    const status = threshold == null ? null : (Math.abs(changePercentage) > threshold ? '\u26A0\uFE0F' : '\u2705');
    const alert = status == null ? null : status === '\u26A0\uFE0F';
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
            alert,
            source,
            note,
          },
        });
      }
    } catch (err) {
      this.logger.error('Failed to insert InputSnapshot');
    }

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
    // Fetch threshold from Asset.pegStabilityThreshold; if null, keep it null
    let threshold: number | null = null;
    try {
      const assetId = maturityItem?.maturity?.assetId;
      if (assetId) {
        const asset = await this.prisma.asset.findUnique({
          where: { id: assetId },
          select: { pegStabilityThreshold: true },
        });
        if (asset?.pegStabilityThreshold != null) {
          const t = Number((asset as any).pegStabilityThreshold);
          threshold = Number.isFinite(t) ? t : null;
        }
      }
    } catch {}
    const status = threshold == null ? null : (Math.abs(changePercentage) > threshold ? '\u26A0\uFE0F' : '\u2705');
    const alert = status == null ? null : status === '\u26A0\uFE0F';
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
            alert,
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
    // Fetch threshold from Asset.liquidityDepthThreshold; if null, keep it null
    let threshold: number | null = null;
    try {
      const assetId = maturityItem?.maturity?.assetId;
      if (assetId) {
        const asset = await this.prisma.asset.findUnique({
          where: { id: assetId },
          select: { liquidityDepthThreshold: true },
        });
        if (asset?.liquidityDepthThreshold != null) {
          const t = Number((asset as any).liquidityDepthThreshold);
          threshold = Number.isFinite(t) ? t : null;
        }
      }
    } catch {}
    const status = threshold == null ? null : (Math.abs(changePercentage) > threshold ? '\u26A0\uFE0F' : '\u2705');
    const alert = status == null ? null : status === '\u26A0\uFE0F';
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

  private async calculateGasPrice(_maturityItem: any) {
    const gas = await this.getBaseGasPriceGwei(this.httpService)
    
    const metricTitle = 'gas_price';
    const currentValue = Number(gas?.gasPriceGwei ?? 0);

    let previousValue = 0;
    try {
      const assetId = _maturityItem?.maturity?.assetId;
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

    const changePercentage = (currentValue - previousValue) / previousValue;

    // Fetch threshold from Asset.gasPriceGweiThreshold; if null, keep it null
    let threshold: number | null = null;
    try {
      const assetId = _maturityItem?.maturity?.assetId;
      if (assetId) {
        const asset = await this.prisma.asset.findUnique({
          where: { id: assetId },
          select: { gasPriceGweiThreshold: true },
        });
        if (asset?.gasPriceGweiThreshold != null) {
          const t = Number((asset as any).gasPriceGweiThreshold);
          threshold = Number.isFinite(t) ? t : null;
        }
      }
    } catch {}

    const status = threshold == null ? null : (currentValue > threshold ? '\u26A0\uFE0F' : '\u2705');
    const alert = threshold == null ? null : currentValue > threshold;
    const source = 'Infura eth_gasPrice';
    const note = null;

    try {
      const maturitySnapshotId = _maturityItem?.maturity?.id;
      if (maturitySnapshotId && this.prisma) {
        await this.prisma.inputSnapshot.create({
          data: {
            maturitySnapshotId,
            metric: metricTitle,
            currentValue,
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
      this.logger.error('Failed to insert InputSnapshot (Gas Price)');
    }
    return gas;
  }

  private async getBaseGasPriceGwei(http: HttpService) {
  const rpcUrl =
    'https://mainnet.infura.io/v3/b4782483afbb4b5f8073848f49bf5d47';

  const payload = {
    jsonrpc: '2.0',
    method: 'eth_gasPrice',
    params: [],
    id: 1,
  };

  const response = await lastValueFrom(
    http.post(rpcUrl, payload, {
      headers: { 'Content-Type': 'application/json' },
    }),
  );

  const resultHex: string | undefined = response?.data?.result;
  if (!resultHex) {
    throw new Error(
      `Invalid eth_gasPrice response: ${JSON.stringify(response?.data)}`,
    );
  }

  // resultHex is something like "0x3b9aca00"
  const weiBigInt = BigInt(resultHex); // BigInt understands 0x...
  // Use fractional conversion to avoid truncation: gwei = wei / 1e9
  const gasPriceGwei = Number(weiBigInt) / 1e9;

  return {
    gasPriceWei: weiBigInt.toString(),
    gasPriceGwei,
    raw: response.data,
  };
  }
  

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
    // Fetch threshold from Asset.ytAccumulatedThreshold; if null, keep it null
    let threshold: number | null = null;
    try {
      const assetId = maturityItem?.maturity?.assetId;
      if (assetId) {
        const asset = await this.prisma.asset.findUnique({
          where: { id: assetId },
          select: { ytAccumulatedThreshold: true },
        });
        if (asset?.ytAccumulatedThreshold != null) {
          const t = Number((asset as any).ytAccumulatedThreshold);
          threshold = Number.isFinite(t) ? t : null;
        }
      }
    } catch {}
    const status = threshold == null ? null : (ytAccumulated > threshold ? '\uD83C\uDFAF' : '\u2705');
    const alert = threshold == null ? null : ytAccumulated > threshold;
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
    // Fetch threshold from Asset.ptPriceThreshold; if null, keep it null
    let threshold: number | null = null;
    try {
      const assetId = maturityItem?.maturity?.assetId;
      if (assetId) {
        const asset = await this.prisma.asset.findUnique({
          where: { id: assetId },
          select: { ptPriceThreshold: true },
        });
        if (asset?.ptPriceThreshold != null) {
          const t = Number((asset as any).ptPriceThreshold);
          threshold = Number.isFinite(t) ? t : null;
        }
      }
    } catch {}
    const status = threshold == null ? null : (Math.abs(changePercentage) > threshold ? '\u26A0\uFE0F' : '\u2705');
    const alert = status == null ? null : status === '\u26A0\uFE0F';
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

  public async getLastHarvestDate(vaultAddress: string): Promise<Date | null> {
      const query = `
        query ($vault: String!) {
          transactions(
            first: 1
            orderBy: timestamp
            orderDirection: desc
            where: {
              vault: $vault
              type_in: ["Harvest", "Claim", "YieldClaimed"]
            }
          ) {
            timestamp
          }
        }
      `;
      const variables = { vault: vaultAddress.toLowerCase() };
      const url =
        'https://subgraph.satsuma-prod.com/93c7f5423489/perspective/spectra-base/api';
      try {
        const response: AxiosResponse<any> = await lastValueFrom(
          this.httpService.post<any>(
            url,
            { query, variables },
            { headers: { 'Content-Type': 'application/json' } },
          ),
        );
        const ts = response.data?.data?.transactions?.[0]?.timestamp;
        if (!ts) {
          return null;
        }
        // Convert the Unix timestamp (seconds) to JavaScript Date (milliseconds)
        return new Date(Number(ts) * 1000);
      } catch (error) {
        Logger.warn(`Failed to fetch last harvest date: ${error}`);
        return null;
      }
    }

}

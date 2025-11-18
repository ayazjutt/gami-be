import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DiscoveryMaturityService } from './discovery.maturity.service';

@Injectable()
export class DiscoveryAlertsService {
  private readonly logger = new Logger(DiscoveryAlertsService.name);

  constructor(
    @Inject(forwardRef(() => DiscoveryMaturityService))
    private readonly maturity: DiscoveryMaturityService,
    private readonly prisma: PrismaService,
  ) {}

  private toNum(v: unknown): number | null {
    if (v == null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  private readonly thresholdSettingKeyByMetric: Record<string, string> = {
    'PT-Mispricing': 'PT Mispricing Threshold',
    'YT Harvest': 'YT Harvest Threshold',
    'Liquidity Crisis': 'Liquidity Crisis Threshold',
    'Gas Spike': 'Gas Spike Threshold',
    'Maturity Alert': 'Maturity Alert Threshold',
  };

  private async getMetricThreshold(metric: string): Promise<number | null> {
    const key = this.thresholdSettingKeyByMetric[metric] ?? `${metric} Threshold`;
    const row = await this.prisma.setting.findUnique({ where: { key } as any });
    const val = (row as any)?.numValue ?? (row as any)?.value;
    return this.toNum(val);
  }

  async calc() {
    const maturities = await this.maturity.getLatestMaturities();
    this.logger.log(`Alerts: fetched ${maturities.length} maturities`);
    for (const m of maturities) {
      await this.computeAndSavePTMispricing(m);
      await this.computeAndSaveYTHarvest(m);
      await this.computeAndSaveLiquidityCrisis(m);
      await this.computeAndSaveGasSpike(m);
      await this.computeAndSaveMaturityAlert(m);
    }
    return maturities;
  }

  private async computeAndSavePTMispricing(m: any) {
    const metric = 'PT-Mispricing';
    const threshold = await this.getMetricThreshold(metric);
    const inputs: any[] = Array.isArray(m?.maturity?.inputSnapshot)
      ? (m.maturity.inputSnapshot as any[])
      : [];
    const findInput = (key: string) => inputs.find((x: any) => x?.metric === key);
    const ptPrice = this.toNum((findInput('pt_price') as any)?.currentValue);
    const ptFair = this.toNum((findInput('pt_fair_value') as any)?.currentValue);
    const ratio = ptPrice != null && ptFair != null && ptFair !== 0 ? Math.abs(ptPrice - ptFair) / Math.abs(ptFair) : null;
    const conditionMet = ratio != null && threshold != null ? ratio > threshold : false;
    const currentValueNum = ptPrice != null && ptFair != null && ptFair !== 0 ? ((ptPrice - ptFair) / ptFair) * 100 : null;
    const currentValue = currentValueNum as any;
    const priority = (conditionMet ? 'HIGH' : 'LOW') as any;
    const actionRequired = (conditionMet ? 'EXECUTE_ARBITRAGE' : 'MONITOR') as any;
    const autoAction = 'SIGNAL_BOT' as any;
    const manualReview = 'STRATEGY_REVIEW' as any;
    const maturitySnapshotId = Number(m?.maturity?.id) || null;

    await this.prisma.alertsSnapshot.create({
      data: {
        metric,
        conditionMet,
        currentValue,
        threshold: threshold as any,
        priority,
        actionRequired,
        autoAction,
        manualReview,
        maturitySnapshotId,
      },
    });
  }

  private async computeAndSaveYTHarvest(m: any) {
    const metric = 'YT Harvest';
    const threshold = await this.getMetricThreshold(metric);
    const inputs: any[] = Array.isArray(m?.maturity?.inputSnapshot)
      ? (m.maturity.inputSnapshot as any[])
      : [];
    const findInput = (key: string) => inputs.find((x: any) => x?.metric === key);
    const ytAccum = this.toNum((findInput('yt_accumulated') as any)?.currentValue);
    const conditionMet = ytAccum != null && threshold != null ? ytAccum > threshold : false;
    const currentValue = ytAccum as any;
    const priority = (conditionMet ? 'MEDIUM' : 'LOW') as any;
    const actionRequired = (conditionMet ? 'EXECUTE_HARVEST' : 'WAIT') as any;
    const autoAction = 'AUTO_HARVEST' as any;
    const manualReview = 'CHECK_GAS' as any;
    const maturitySnapshotId = Number(m?.maturity?.id) || null;

    await this.prisma.alertsSnapshot.create({
      data: {
        metric,
        conditionMet,
        currentValue,
        threshold: threshold as any,
        priority,
        actionRequired,
        autoAction,
        manualReview,
        maturitySnapshotId,
      },
    });
  }

  private async computeAndSaveLiquidityCrisis(m: any) {
    const metric = 'Liquidity Crisis';
    const threshold = await this.getMetricThreshold(metric);
    const inputs: any[] = Array.isArray(m?.maturity?.inputSnapshot)
      ? (m.maturity.inputSnapshot as any[])
      : [];
    const findInput = (key: string) => inputs.find((x: any) => x?.metric === key);
    const gasGwei = this.toNum((findInput('gas_price') as any)?.currentValue);
    const conditionMet = gasGwei != null && threshold != null ? gasGwei < -threshold : false;
    const currentValue = gasGwei as any;
    const priority = (conditionMet ? 'CRITICAL' : 'LOW') as any;
    const actionRequired = (conditionMet ? 'REDUCE_POSITIONS' : 'CONTINUE') as any;
    const autoAction = 'PAUSE_TRADING' as any;
    const manualReview = 'REVIEW_SIZE' as any;
    const maturitySnapshotId = Number(m?.maturity?.id) || null;

    await this.prisma.alertsSnapshot.create({
      data: {
        metric,
        conditionMet,
        currentValue,
        threshold: threshold as any,
        priority,
        actionRequired,
        autoAction,
        manualReview,
        maturitySnapshotId,
      },
    });
  }

  private async computeAndSaveGasSpike(m: any) {
    const metric = 'Gas Spike';
    const threshold = await this.getMetricThreshold(metric);
    const inputs: any[] = Array.isArray(m?.maturity?.inputSnapshot)
      ? (m.maturity.inputSnapshot as any[])
      : [];
    const findInput = (key: string) => inputs.find((x: any) => x?.metric === key);
    const gasGwei = this.toNum((findInput('gas_price') as any)?.currentValue);
    const conditionMet = gasGwei != null && threshold != null ? gasGwei > threshold : false;
    const currentValue = gasGwei as any;
    const priority = (conditionMet ? 'MEDIUM' : 'LOW') as any;
    const actionRequired = (conditionMet ? 'DELAY_TRANSACTIONS' : 'CONTINUE') as any;
    const autoAction = 'QUEUE_TXS' as any;
    const manualReview = 'COST_ANALYSIS' as any;
    const maturitySnapshotId = Number(m?.maturity?.id) || null;

    await this.prisma.alertsSnapshot.create({
      data: {
        metric,
        conditionMet,
        currentValue,
        threshold: threshold as any,
        priority,
        actionRequired,
        autoAction,
        manualReview,
        maturitySnapshotId,
      },
    });
  }

  private async computeAndSaveMaturityAlert(m: any) {
    const metric = 'Maturity Alert';
    const conditionMet = false;
    const currentValue = null as any;
    const threshold = await this.getMetricThreshold(metric);
    const priority = 'CRITICAL' as any;
    const actionRequired = 'PLAN_ROLLOVER' as any;
    const autoAction = 'ROLLOVER_ALERT' as any;
    const manualReview = 'EMERGENCY_PLAN' as any;
    const maturitySnapshotId = Number(m?.maturity?.id) || null;

    await this.prisma.alertsSnapshot.create({
      data: {
        metric,
        conditionMet,
        currentValue,
        threshold: threshold as any,
        priority,
        actionRequired,
        autoAction,
        manualReview,
        maturitySnapshotId,
      },
    });
  }
}

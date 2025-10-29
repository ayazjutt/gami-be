import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Priority, ActionRequired, AutoAction, ManualReview } from '@prisma/client';

@Injectable()
export class AlertMetricsService {
  private readonly logger = new Logger(AlertMetricsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * calculateMetrics
   * 1) Load thresholds from Setting table (for the 5 requested keys)
   * 2) Find the latest 3M maturities (tenureId = 1) per asset where asset.isRemoved = false
   *    For each maturity, attach latest InputSnapshots per InputMetric (by timestamp desc),
   *    and replace inputMetricId with inputMetric.title as key
   * 3) Load AlertMetric rows and iterate; stub PT-3M Mispricing check
   */
  async calculateMetrics() {
    // 1) Load threshold settings
    const thresholdKeys = [
      'PT-3M Mispricing Threshold',
      'YT-3M Harvest Threshold',
      'Liquidity Crisis Threshold',
      'Gas Spike Threshold',
      'Maturity Alert Threshold',
    ];
    const settingsRows = await this.prisma.setting.findMany({ where: { key: { in: thresholdKeys } } });
    const thresholds = new Map<string, number | null>();
    for (const s of settingsRows) {
      const n = s.numValue != null ? Number(s.numValue as any) : s.value != null ? Number(s.value) : null;
      thresholds.set(s.key, Number.isFinite(n as number) ? (n as number) : null);
    }

    // 2) Get latest 3M maturities (tenureId = 1) for non-removed assets
    const maturitiesRaw = await this.prisma.maturitySnapshot.findMany({
      where: {
        tenureId: 1, // per request: tenure = 1 (3M)
        asset: { isRemoved: false },
      },
      include: { asset: { select: { id: true, symbol: true } } },
      orderBy: { maturityTs: 'desc' },
    });

    // Deduplicate: latest per assetId
    const byAsset = new Map<number, typeof maturitiesRaw[number]>();
    for (const m of maturitiesRaw) {
      if (!byAsset.has(m.assetId)) {
        byAsset.set(m.assetId, m);
      }
    }
    const maturities = Array.from(byAsset.values());

    // Attach latest InputSnapshots per InputMetric title
    const maturityDetails = [] as Array<{
      maturityId: number;
      assetId: number;
      assetSymbol: string | null;
      maturityTs: string;
      // inputSnapshot grouped by inputRole.title => array of metric entries
      inputSnapshot: Record<string, Array<{
        role: string;
        metricId: number;
        metricTitle: string; // inputMetric.title (generic)
        display: string | null; // InputSnapshot.metric (display string)
        timestamp: string;
        currentValue: number | null;
        previousValue: number | null;
        changePct: number | null;
        threshold: number | null;
        status: string | null;
        alert: boolean | null;
        source: string | null;
      }>>;
      mispricing: number | null;
      mispricingCondition: number | null;
    }>;

    for (const m of maturities) {
      const rows = await this.prisma.inputSnapshot.findMany({
        where: { maturitySnapshotId: m.id },
        include: { inputMetric: true, inputRole: true },
        orderBy: { timestamp: 'desc' },
      });

      // Deduplicate by role+metric to keep the latest only
      const latestByRoleMetric = new Map<string, typeof rows[number]>();
      for (const r of rows) {
        const key = `${r.inputRoleId}:${r.inputMetricId}`;
        if (!latestByRoleMetric.has(key)) {
          latestByRoleMetric.set(key, r);
        }
      }

      // Group by inputRole.title
      const inputSnapshot: Record<string, Array<any>> = {};
      const toNum = (v: any): number | null => (v != null ? Number(v) : null);
      for (const r of latestByRoleMetric.values()) {
        const roleTitle = r.inputRole?.title ?? `role:${r.inputRoleId}`;
        if (!inputSnapshot[roleTitle]) inputSnapshot[roleTitle] = [];
        inputSnapshot[roleTitle].push({
          role: roleTitle,
          metricId: r.inputMetricId,
          metricTitle: r.inputMetric?.title ?? `metric:${r.inputMetricId}`,
          display: r.metric ?? null,
          timestamp: r.timestamp.toISOString(),
          currentValue: toNum(r.currentValue),
          previousValue: toNum(r.previousValue),
          changePct: toNum(r.changePct),
          threshold: toNum(r.threshold),
          status: r.status ?? null,
          alert: r.alert ?? null,
          source: r.source ?? null,
        });
      }

      // compute mispricing: ((YT 3M Price - YT 3M Fair Value) / YT 3M Fair Value) * 100
      const getFromGroup = (role: string, metricTitle: string): number | null => {
        const arr = inputSnapshot[role] as Array<any> | undefined;
        if (!arr || !arr.length) return null;
        const found = arr.find((x) => x.metricTitle === metricTitle);
        return found?.currentValue ?? null;
      };
      const ytPrice = getFromGroup('YIELD TOKENS (YT)', '3M Price');
      const ytFair = getFromGroup('YIELD TOKENS (YT)', '3M Fair Value') ?? getFromGroup('PRINCIPAL TOKENS (PT)', '3M Fair Value');
      const mispricingCondition = ytPrice != null && ytFair != null && ytFair !== 0 ? (ytPrice - ytFair) / ytFair : null;
      const mispricing = mispricingCondition != null ? mispricingCondition * 100 : null;

      maturityDetails.push({
        maturityId: m.id,
        assetId: m.assetId,
        assetSymbol: (m as any)?.asset?.symbol ?? null,
        maturityTs: m.maturityTs.toISOString(),
        inputSnapshot,
        mispricing,
        mispricingCondition,
      });
    }

    // 3) Load AlertMetric and iterate
    const alertMetrics = await this.prisma.alertMetric.findMany();
    let mispricingAvg: number | null = null;
    let mispricingConditionAvg: number | null = null;
    let mispricingConditionMet: number = 0;
    for (const metric of alertMetrics) {
      if (metric.title === 'PT-3M Mispricing') {
        // Return a simple summary for visibility/use by controller
        const mispricingNums = maturityDetails
          .map((x) => x.mispricing)
          .filter((v): v is number => v != null && Number.isFinite(v));
        mispricingAvg = mispricingNums.length
          ? mispricingNums.reduce((a, b) => a + b, 0) / mispricingNums.length
          : null;

        const mispricingCondNums = maturityDetails
          .map((x: any) => x.mispricingCondition as number | null)
          .filter((v): v is number => v != null && Number.isFinite(v));
        mispricingConditionAvg = mispricingCondNums.length
          ? mispricingCondNums.reduce((a, b) => a + b, 0) / mispricingCondNums.length
          : null;

        const thr = thresholds.get('PT-3M Mispricing Threshold') ?? null;
        mispricingConditionMet =
          mispricingConditionAvg != null && thr != null
            ? (mispricingConditionAvg > thr ? 1 : 0)
            : 0;

        // Insert AlertSnapshot record for PT-3M Mispricing
        await this.prisma.alertSnapshot.create({
          data: {
            alertMetricId: metric.id,
            alertType: metric.title,
            conditionMet: mispricingConditionMet === 1,
            currentValue: mispricingConditionAvg ?? null,
            threshold: thr ?? null,
            priority: mispricingConditionMet === 1 ? Priority.HIGH : Priority.LOW,
            actionRequired: mispricingConditionMet === 1 ? ActionRequired.REBALANCE : ActionRequired.MONITOR,
            autoAction: AutoAction.SWAP,
            manualReview: ManualReview.REVIEW,
          },
        });
      }

      if (metric.title === 'YT-3M Harvest') {
        // Extract latest YT-3M Accumulated values across maturities
        const ytAccValues = maturityDetails
          .map((m) => {
            const group = m.inputSnapshot['YIELD TOKENS (YT)'] as Array<any> | undefined;
            if (!group || !group.length) return null;
            const found = group.find((x) => x.metricTitle === 'YT-3M Accumulated');
            return found?.currentValue ?? null;
          })
          .filter((v): v is number => v != null && Number.isFinite(v));

        const currentMaxAcc = ytAccValues.length ? Math.max(...ytAccValues) : null;
        const thrYT = thresholds.get('YT-3M Harvest Threshold') ?? null;
        const conditionMet = currentMaxAcc != null && thrYT != null ? currentMaxAcc > thrYT : false;

        await this.prisma.alertSnapshot.create({
          data: {
            alertMetricId: metric.id,
            alertType: metric.title,
            conditionMet,
            currentValue: currentMaxAcc ?? null,
            threshold: thrYT ?? null,
            priority: conditionMet ? Priority.HIGH : Priority.LOW,
            actionRequired: conditionMet ? ActionRequired.HARVEST : ActionRequired.MONITOR,
            autoAction: AutoAction.HARVEST,
            manualReview: ManualReview.REVIEW,
          },
        });
      }
    }

    

    return {
      thresholds: Object.fromEntries(thresholds.entries()),
      maturities: maturityDetails,
      alertMetrics: alertMetrics.map((m) => m.title),
      mispricingAvg,
      mispricingConditionAvg,
      mispricingConditionMet,
    };
  }
}

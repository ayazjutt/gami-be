import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type PtMetricRow = {
  assetId: number;
  assetSymbol: string | null;
  maturityTs: string;
  ptPrice: number | null;
  fairValue: number | null;
  premiumPct: number | null; // (ptPrice - fairValue) / fairValue * 100
};

@Injectable()
export class PtTrackingService {
  private readonly logger = new Logger(PtTrackingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * calculateMetrics
   * - Collect latest 3M maturities per asset (non-removed)
   * - For each maturity, fetch latest InputSnapshots and extract PT 3M Price and 3M Fair Value
   * - Compute premium/discount percentage and return a summary
   */
  async calculateMetrics() {
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
      createdAt: string;
      payload: any;
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
        createdAt: (m as any)?.createdAt ? (m as any).createdAt.toISOString() : new Date().toISOString(),
        payload: (m as any)?.payload ?? null,
        inputSnapshot,
        mispricing,
        mispricingCondition,
      });
    }

     return {
      maturities: maturityDetails[0],
    };
  }
}

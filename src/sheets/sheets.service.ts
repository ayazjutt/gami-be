import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export interface MetricRow {
  metric: string;
  currentValue: number | null;
  previousValue: number | null;
  changePct: number | null;
  threshold: number | null;
  status: '✅' | '⚠️' | null;
  alert: boolean;
  source: string;
  notes?: string;
}

@Injectable()
export class SheetsService {
  private readonly prisma = new PrismaClient();

  private thresholds = {
    apy: 2,
    liquidity: 5,
    ptPrice: 2,
    ptFair: 2,
    ytPrice: 2,
    ytApy: 2,
    gas: 10,
  };


}
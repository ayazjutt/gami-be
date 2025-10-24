import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService, Status } from '@prisma/client';

@Injectable()
export class DiscoveryService {
  private readonly logger = new Logger(DiscoveryService.name);
  constructor(private prisma: PrismaService) {}

  // hourly: upsert assets/maturities/pools
  @Cron('0 * * * *')
  async discover() {
    // 1) fetch from portfolio/subgraph per network
    // 2) upsert Asset by (networkId, ibtAddress)
    // 3) upsert Maturity by (assetId, maturityDate) & set tenorMonths
    // 4) upsert Pools by (maturityId, poolType)
    // 5) mark missing as HIDDEN
    this.logger.log('Discovery run complete');
  }
}

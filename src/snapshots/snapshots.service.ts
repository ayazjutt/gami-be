import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';


@Injectable()
export class SnapshotsService {
  private readonly logger = new Logger(SnapshotsService.name);
  constructor(private prisma: PrismaService) {}

  // every 15 minutes
  @Cron('*/15 * * * *')
  async snapshot() {
    // 1) read active maturities/pools
    // 2) fetch PT/ YT/ LP metrics
    // 3) insert into pt_snapshots / yt_snapshots / lp_snapshots (unique by key)
    // 4) compute & upsert portfolio_interval_metrics (optional here)
    this.logger.log('Snapshot run complete');
  }
}

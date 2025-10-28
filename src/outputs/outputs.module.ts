import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { OutputMetricsService } from './output-metrics.service';
import { OutputSnapshotsController } from './output-snapshots.controller';

@Module({
  imports: [PrismaModule],
  controllers: [OutputSnapshotsController],
  providers: [OutputMetricsService],
  exports: [OutputMetricsService],
})
export class OutputsModule {}

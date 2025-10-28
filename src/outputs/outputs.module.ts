import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { OutputMetricsService } from './output-metrics.service';

@Module({
  imports: [PrismaModule],
  providers: [OutputMetricsService],
  exports: [OutputMetricsService],
})
export class OutputsModule {}

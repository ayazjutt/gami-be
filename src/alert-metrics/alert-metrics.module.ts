import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AlertMetricsService } from './alert-metrics.service';
import { AlertMetricsController } from './alert-metrics.controller';

@Module({
  imports: [PrismaModule],
  controllers: [AlertMetricsController],
  providers: [AlertMetricsService],
  exports: [AlertMetricsService],
})
export class AlertMetricsModule {}


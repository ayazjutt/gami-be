import { Controller, Get } from '@nestjs/common';
import { AlertMetricsService } from './alert-metrics.service';

@Controller('alert-metrics')
export class AlertMetricsController {
  constructor(private readonly service: AlertMetricsService) {}

  @Get('calculate')
  async calculate() {
    return this.service.calculateMetrics();
  }
}


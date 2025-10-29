import { Controller, Get } from '@nestjs/common';
import { PtTrackingService } from './pt-tracking.service';

@Controller('pt-tracking')
export class PtTrackingController {
  constructor(private readonly service: PtTrackingService) {}

  @Get('metrics')
  async metrics() {
    return this.service.calculateMetrics();
  }
}


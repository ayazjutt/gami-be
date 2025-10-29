import { Controller, Get } from '@nestjs/common';
import { OutputMetricsService, OutputSnapshotSummary } from './output-metrics.service';

@Controller('output-snapshots')
export class OutputSnapshotsController {
  constructor(private readonly outputMetricsService: OutputMetricsService) {}

  // @Get()
  // async getAll(): Promise<OutputSnapshotSummary[]> {
  //   return this.outputMetricsService.getAllOutputSnapshots();
  // }
}

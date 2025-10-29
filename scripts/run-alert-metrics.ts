import 'dotenv/config';
import 'reflect-metadata';
import { Module, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AlertMetricsModule } from '../src/alert-metrics/alert-metrics.module';
import { AlertMetricsService } from '../src/alert-metrics/alert-metrics.service';

@Module({
  imports: [AlertMetricsModule],
})
class AlertMetricsScriptModule {}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AlertMetricsScriptModule, {
    logger: ['log', 'error', 'warn'],
  });

  try {
    const service = app.get(AlertMetricsService);
    const result = await service.calculateMetrics();
    const logger = new Logger('AlertMetricsRunner');
    logger.log('Alert metrics calculation completed.');
    // Output the result for CLI usage
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Failed to run alert metrics calculation', e);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

bootstrap();


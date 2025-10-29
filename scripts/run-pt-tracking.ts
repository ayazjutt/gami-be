import 'dotenv/config';
import 'reflect-metadata';
import { Module, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { PtTrackingModule } from '../src/pt-tracking/pt-tracking.module';
import { PtTrackingService } from '../src/pt-tracking/pt-tracking.service';

@Module({
  imports: [PtTrackingModule],
})
class PtTrackingScriptModule {}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(PtTrackingScriptModule, {
    logger: ['log', 'error', 'warn'],
  });

  try {
    const service = app.get(PtTrackingService);
    const result = await service.calculateMetrics();
    const logger = new Logger('PtTrackingRunner');
    logger.log('PT tracking metrics calculation completed.');
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Failed to run PT tracking calculation', e);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

bootstrap();


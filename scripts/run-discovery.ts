/* script/run-discovery.ts */
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { DiscoveryModule } from '../src/discovery/discovery.module';
import { DiscoveryMaturityService } from '../src/discovery/discovery.maturity.service';

@Module({
  imports: [DiscoveryModule],
})
class ScriptModule {}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(ScriptModule, {
    logger: ['log', 'error', 'warn'],
  });

  try {
    const svc = app.get(DiscoveryMaturityService);
    await svc.runOnce();
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

bootstrap();

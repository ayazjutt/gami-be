// import 'dotenv/config';
// import 'reflect-metadata';
// import { Logger } from '@nestjs/common';
// import { Module } from '@nestjs/common';
// import { NestFactory } from '@nestjs/core';
// import { OutputMetricsService } from '../src/outputs/output-metrics.service';
// import { OutputsModule } from '../src/outputs/outputs.module';

// @Module({
//   imports: [OutputsModule],
// })
// class OutputSnapshotsScriptModule {}

// async function bootstrap() {
//   const app = await NestFactory.createApplicationContext(OutputSnapshotsScriptModule, {
//     logger: ['log', 'error', 'warn'],
//   });

//   try {
//     const service = app.get(OutputMetricsService);
//     const runAt = new Date();
//     await service.createOutputSnapshot1(runAt);
//     const logger = new Logger('OutputSnapshotsRunner');
//     logger.log('MetaVault output snapshots computation completed.');
//   } finally {
//     await app.close();
//   }
// }

// bootstrap().catch((error) => {
//   // eslint-disable-next-line no-console
//   console.error('Failed to compute output snapshots', error);
//   process.exitCode = 1;
// });

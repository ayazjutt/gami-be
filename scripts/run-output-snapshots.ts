import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';
import { OutputMetricsService } from '../src/outputs/output-metrics.service';

async function main() {
  const logger = new Logger('OutputSnapshotsRunner');
  const prisma = new PrismaService();
  await prisma.$connect();

  const service = new OutputMetricsService(prisma);

  try {
    await service.createOutputSnapshots();
    logger.log('MetaVault output snapshots computation completed.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Failed to compute output snapshots', error);
  process.exitCode = 1;
});

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.network.upsert({
    where: { name: 'eth' },
    update: {},
    create: { name: 'eth', explorerBaseUrl: 'https://etherscan.io' },
  });
  await prisma.network.upsert({
    where: { name: 'base' },
    update: {},
    create: { name: 'base', explorerBaseUrl: 'https://basescan.org' },
  });
  await prisma.network.upsert({
    where: { name: 'avax' },
    update: {},
    create: { name: 'avax', explorerBaseUrl: 'https://snowtrace.io' },
  });
  await prisma.network.upsert({
    where: { name: 'hyperevm' },
    update: {},
    create: { name: 'hyperevm', explorerBaseUrl: '...' },
  });
}
main().finally(() => prisma.$disconnect());
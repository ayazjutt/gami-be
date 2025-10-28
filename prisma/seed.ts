// prisma/seed.ts
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  // Networks (from your earlier plan)
  const networks = [
    { name: 'Mainnet',  slug: 'mainnet',  chainId: 1 },
    { name: 'Arbitrum', slug: 'arbitrum', chainId: 42161 },
    { name: 'Optimism', slug: 'optimism', chainId: 10 },
    { name: 'Base',     slug: 'base',     chainId: 8453 },
    { name: 'Sonic',    slug: 'sonic',    chainId: null },
    { name: 'Hemi',     slug: 'hemi',     chainId: null },
    { name: 'HyperEVM', slug: 'hyperevm', chainId: null },
  ]
  for (const n of networks) {
    await prisma.network.upsert({
      where: { slug: n.slug },
      update: n,
      create: n,
    })
  }

  // Tenures
  const tenures = ['3M','6M','12M']
  for (const t of tenures) {
    await prisma.tenure.upsert({
      where: { title: t },
      update: {},
      create: { title: t },
    })
  }

  // Input Roles
  const inputRoles = [
    'UNDERLYING ASSETS',
    'PRINCIPAL TOKENS (PT)',
    'YIELD TOKENS (YT)',
  ]
  for (const r of inputRoles) {
    await prisma.inputRole.upsert({
      where: { title: r },
      update: {},
      create: { title: r },
    })
  }

  // Input Metrics (exact strings you requested)
  const inputMetrics = [
    'APY',
    'Peg Stability',
    'Liquidity Depth',
    'Gas Price (Gwei)',
    '3M Price',
    '6M Price',
    '12M Price',
    '3M Fair Value',
    '6M Fair Value',
    '12M Fair Value',
    'YT-3M Accumulated',
    'YT-6M Accumulated',
    'YT-12M Accumulated',
  ];
  for (const m of inputMetrics) {
    await prisma.inputMetric.upsert({
      where: { title: m },
      update: {},
      create: { title: m },
    })
  }

  // Output Metrics
  const outputMetrics = [
    'MetaVault Net APY',
    'Alpha Generation',
    'Sharpe Ratio',
    'Maximum Drawdown',
    'Yield Efficiency',
    'Harvest Frequency',
    'Gas Efficiency',
    'Slippage Control',
  ]
  for (const m of outputMetrics) {
    await prisma.outputMetric.upsert({
      where: { title: m },
      update: {},
      create: { title: m },
    })
  }

  // Alert Metrics
  const alertMetrics = [
    'PT-3M Mispricing',
    'YT-3M Harvest',
    'Liquidity Crisis',
    'Gas Spike',
    'Maturity Alert',
  ]
  for (const m of alertMetrics) {
    await prisma.alertMetric.upsert({
      where: { title: m },
      update: {},
      create: { title: m },
    })
  }

  // Settings (fill from your Settings sheet—examples below)
  // --- SETTINGS (from ⚙️ SETTINGS sheet) ---
const settings = [
  {
    key: 'MANAGEMENT_FEE_RATE',
    value: null,
    numValue: '0.015', // 1.5%
    notes: 'Annual management fee (1.5%)',
  },
  {
    key: 'PERFORMANCE_FEE_RATE',
    value: null,
    numValue: '0.200', // 20%
    notes: 'Performance fee (20%)',
  },
  {
    key: 'BENCHMARK_APY',
    value: null,
    numValue: '0.200', // 20%
    notes: 'sUSDe direct staking APY',
  },
  {
    key: 'TARGET_ALPHA',
    value: null,
    numValue: '0.040', // 4%
    notes: 'Target outperformance (400bps)',
  },
  {
    key: 'HARVEST_THRESHOLD',
    value: null,
    numValue: '500', // USD
    notes: 'Minimum $ to trigger harvest',
  },
  {
    key: 'GAS_ALERT_THRESHOLD',
    value: null,
    numValue: '100', // gwei
    notes: 'Gwei threshold for gas alerts',
  },
  {
    key: 'PT_MISPRICING_THRESHOLD',
    value: null,
    numValue: '0.020', // 2%
    notes: 'PT mispricing alert threshold (2%)',
  },
  {
    key: 'YT_MISPRICING_THRESHOLD',
    value: null,
    numValue: '0.050', // 5%
    notes: 'YT mispricing alert threshold (5%)',
  },
  {
    key: 'LIQUIDITY_ALERT_THRESHOLD',
    value: null,
    numValue: '0.050', // 5%
    notes: 'Liquidity drop alert threshold (5%)',
  },
  {
    key: 'MATURITY_ALERT_DAYS',
    value: null,
    numValue: '30', // days
    notes: 'Days before maturity to alert',
  },
  {
    key: 'REBALANCE_THRESHOLD',
    value: null,
    numValue: '0.100', // 10%
    notes: 'Allocation variance to trigger rebalance (10%)',
  },
]

// upsert all settings
for (const s of settings) {
  await prisma.setting.upsert({
    where: { key: s.key },
    update: s,
    create: s,
  })
}

}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })

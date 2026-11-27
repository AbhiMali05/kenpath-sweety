import 'dotenv/config';
import bcrypt from 'bcrypt';
import { prisma } from '../src/config/database.js';

const demoName = 'Sweety Demo Account';

function validateSeedConfiguration() {
  if (process.env.SWEETY_SEED_DEMO_DATA !== '1') {
    throw new Error('Demo seeding is opt-in. Set SWEETY_SEED_DEMO_DATA=1 to continue.');
  }
  const databaseUrl = new URL(process.env.DATABASE_URL || '');
  if (!['127.0.0.1', 'localhost', '::1'].includes(databaseUrl.hostname) || databaseUrl.port !== '5432' || databaseUrl.pathname !== '/sweety_db') {
    throw new Error('Demo seeding is restricted to localhost:5432/sweety_db.');
  }
  const email = process.env.SWEETY_DEMO_EMAIL || 'sweety-demo@example.invalid';
  const password = process.env.SWEETY_DEMO_PASSWORD;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Set SWEETY_DEMO_EMAIL to a valid demo email address.');
  }
  if (typeof password !== 'string' || password.length < 12) {
    throw new Error('Set SWEETY_DEMO_PASSWORD to a local demo password of at least 12 characters.');
  }
  return { email: email.trim().toLowerCase(), password };
}

function utcDay(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

async function seedDemoData() {
  const { email, password } = validateSeedConfiguration();
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true } });
  if (existing && existing.name !== demoName) {
    throw new Error('The configured demo email belongs to a non-demo account; no records were changed.');
  }

  const user = existing ?? await prisma.user.create({
    data: { name: demoName, email, passwordHash: await bcrypt.hash(password, 12) },
    select: { id: true },
  });

  const today = utcDay(new Date());
  const previousMonthDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1));
  const rows = [
    ['MORNING_FASTING', 100],
    ['AFTER_BREAKFAST', 140],
    ['AFTER_LUNCH', 120],
    ['AFTER_DINNER', 110],
  ].map(([slot, value]) => ({ userId: user.id, readingDate: today, slot, value }));
  rows.push({ userId: user.id, readingDate: previousMonthDate, slot: 'MORNING_FASTING', value: 125 });

  const result = await prisma.glucoseReading.createMany({ data: rows, skipDuplicates: true });
  console.log(`Demo account is ready; inserted ${result.count} new fictional readings. Password and database details were not logged.`);
}

try {
  await seedDemoData();
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Demo seeding failed.');
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}

import { prisma } from './database.js';

try {
  await prisma.$queryRaw`SELECT 1`;
  console.log('Database connection verified with a read-only query.');
} catch {
  console.error('Database connection verification failed. Check local PostgreSQL availability and configuration.');
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}

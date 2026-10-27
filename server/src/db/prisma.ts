import { PrismaClient } from '@prisma/client';
import { resolveDatabaseUrl } from './dbGuard';

const activeUrl = resolveDatabaseUrl();

export const prisma = new PrismaClient({
  ...(activeUrl ? { datasources: { db: { url: activeUrl } } } : {}),
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

export default prisma;

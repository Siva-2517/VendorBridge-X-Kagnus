import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../db/prisma';
import { db } from '../db/store';
import { isSafeTestDatabaseConfigured } from './testDbGuard';

const isSafeDb = isSafeTestDatabaseConfigured();

describe.skipIf(!isSafeDb)('Live PostgreSQL Sequence Concurrency Suite [MUTATING - REQUIRES TEST_DATABASE_URL]', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    try {
      await prisma.systemSequence.deleteMany({
        where: { name: { in: ['CONCURRENCY_TEST_2026', 'CONCURRENCY_FIRST_2026'] } },
      });
      await prisma.rfq.deleteMany({
        where: { rfqNumber: { startsWith: 'LIVE-CONC-' } },
      });
    } catch (err) {
      console.warn('Live sequence test cleanup warning:', err);
    } finally {
      await prisma.$disconnect();
    }
  });

  it('1. should initialize a brand new sequence row under real PostgreSQL without collision', async () => {
    const seqName = 'CONCURRENCY_FIRST';
    const year = 2026;

    const id1 = await prisma.$transaction(async (tx) => {
      return await db.getNextSequence(tx, seqName, 'LIVE-CONC', year);
    });

    expect(id1).toBe('LIVE-CONC-2026-0001');

    const seqRecord = await prisma.systemSequence.findUnique({
      where: { name: `${seqName}_${year}` },
    });
    expect(seqRecord).not.toBeNull();
    expect(seqRecord!.currentValue).toBe(1);
  });

  it('2. should allocate 10 unique consecutive identifiers under 10 concurrent PostgreSQL transactions', async () => {
    const seqName = 'CONCURRENCY_TEST';
    const year = 2026;
    const concurrencyCount = 10;

    // Concurrently invoke getNextSequence across 10 separate transactions
    const promises = Array.from({ length: concurrencyCount }, (_, i) => {
      return prisma.$transaction(
        async (tx) => {
          // Add small simulated latency to test real row-lock queuing
          await new Promise((r) => setTimeout(r, Math.random() * 20));
          return await db.getNextSequence(tx, seqName, 'LIVE-CONC', year);
        },
        { timeout: 30000, maxWait: 15000 }
      );
    });

    const allocatedIds = await Promise.all(promises);

    // Verify all 10 allocated IDs are strictly unique
    const uniqueIds = new Set(allocatedIds);
    expect(uniqueIds.size).toBe(concurrencyCount);

    // Verify all IDs match expected format from 0001 to 0010
    for (let i = 1; i <= concurrencyCount; i++) {
      const expectedId = `LIVE-CONC-2026-${String(i).padStart(4, '0')}`;
      expect(allocatedIds).toContain(expectedId);
    }

    // Verify the sequence counter in PostgreSQL ended at 10
    const seqRecord = await prisma.systemSequence.findUnique({
      where: { name: `${seqName}_${year}` },
    });
    expect(seqRecord!.currentValue).toBe(concurrencyCount);
  });
});

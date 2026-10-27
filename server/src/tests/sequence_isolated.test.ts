import { describe, it, expect } from 'vitest';
import { db } from '../db/store';
import { Prisma } from '@prisma/client';

/**
 * Isolated Unit Tests for Production Sequence Allocation Logic (db.getNextSequence)
 * Exercises the ACTUAL production method db.getNextSequence in store.ts using
 * mock transaction clients, completely isolated from any live database.
 */
describe('Production Sequence Generator Unit Tests (Isolated Mock Tx)', () => {
  interface MockDbState {
    sequences: Map<string, number>;
    rfqRecords: Set<string>;
    quotationRecords: Set<string>;
  }

  function createMockTx(state: MockDbState, options: { simulatedDelayMs?: number } = {}): Prisma.TransactionClient {
    return {
      systemSequence: {
        upsert: async ({ where, create }: any) => {
          if (!state.sequences.has(where.name)) {
            state.sequences.set(where.name, create.currentValue ?? 0);
          }
          return { name: where.name, currentValue: state.sequences.get(where.name)! };
        },
        findUnique: async ({ where }: any) => {
          if (!state.sequences.has(where.name)) return null;
          return { name: where.name, currentValue: state.sequences.get(where.name)! };
        },
        update: async ({ where, data }: any) => {
          state.sequences.set(where.name, data.currentValue);
          return { name: where.name, currentValue: data.currentValue };
        },
      },
      rfq: {
        findUnique: async ({ where }: any) => {
          if (options.simulatedDelayMs) {
            await new Promise((r) => setTimeout(r, options.simulatedDelayMs));
          }
          if (where.rfqNumber && state.rfqRecords.has(where.rfqNumber)) {
            return { id: 'existing-rfq-id' };
          }
          return null;
        },
      },
      quotation: {
        findUnique: async ({ where }: any) => {
          if (options.simulatedDelayMs) {
            await new Promise((r) => setTimeout(r, options.simulatedDelayMs));
          }
          if (where.quotationNumber && state.quotationRecords.has(where.quotationNumber)) {
            return { id: 'existing-qt-id' };
          }
          return null;
        },
      },
      $queryRaw: async (query: any, ...values: any[]) => {
        // Mock SELECT ... FOR UPDATE row-level lock
        const seqKey = values[0];
        const val = state.sequences.get(seqKey) ?? 0;
        return [{ currentValue: val }];
      },
    } as unknown as Prisma.TransactionClient;
  }

  it('1. should allocate sequential numbers starting from 1 when no previous sequence exists', async () => {
    const state: MockDbState = {
      sequences: new Map(),
      rfqRecords: new Set(),
      quotationRecords: new Set(),
    };
    const tx = createMockTx(state);

    const id1 = await db.getNextSequence(tx, 'RFQ', 'RFQ', 2026);
    state.rfqRecords.add(id1);
    const id2 = await db.getNextSequence(tx, 'RFQ', 'RFQ', 2026);
    state.rfqRecords.add(id2);

    expect(id1).toBe('RFQ-2026-0001');
    expect(id2).toBe('RFQ-2026-0002');
    expect(state.sequences.get('RFQ_2026')).toBe(2);
  });

  it('2. should preserve existing counters and not decrement on re-initialization', async () => {
    const state: MockDbState = {
      sequences: new Map([['RFQ_2026', 7]]),
      rfqRecords: new Set(['RFQ-2026-0001', 'RFQ-2026-0007']),
      quotationRecords: new Set(),
    };
    const tx = createMockTx(state);

    const nextId = await db.getNextSequence(tx, 'RFQ', 'RFQ', 2026);
    expect(nextId).toBe('RFQ-2026-0008');
    expect(state.sequences.get('RFQ_2026')).toBe(8);
  });

  it('3. should probe and self-heal when existing records exist ahead of sequence counter', async () => {
    // Sequence counter was at 3, but records 0004 through 0007 already exist in DB
    const state: MockDbState = {
      sequences: new Map([['RFQ_2026', 3]]),
      rfqRecords: new Set([
        'RFQ-2026-0001',
        'RFQ-2026-0002',
        'RFQ-2026-0003',
        'RFQ-2026-0004',
        'RFQ-2026-0005',
        'RFQ-2026-0006',
        'RFQ-2026-0007',
      ]),
      quotationRecords: new Set(),
    };
    const tx = createMockTx(state);

    const allocatedId = await db.getNextSequence(tx, 'RFQ', 'RFQ', 2026);
    expect(allocatedId).toBe('RFQ-2026-0008');
    expect(state.sequences.get('RFQ_2026')).toBe(8);
  });

  it('4. should not jump to 10000 when nonstandard or test IDs like RFQ-2026-9999 exist', async () => {
    // Nonstandard test record 9999 exists, but sequential sequence is at 7
    const state: MockDbState = {
      sequences: new Map([['RFQ_2026', 7]]),
      rfqRecords: new Set(['RFQ-2026-0001', 'RFQ-2026-0007', 'RFQ-2026-9999', 'RFQ-EXP-123456789']),
      quotationRecords: new Set(),
    };
    const tx = createMockTx(state);

    const nextId = await db.getNextSequence(tx, 'RFQ', 'RFQ', 2026);
    expect(nextId).toBe('RFQ-2026-0008');
    expect(state.sequences.get('RFQ_2026')).toBe(8);
  });

  it('5. should roll over cleanly when year changes without conflicting with previous year', async () => {
    const state: MockDbState = {
      sequences: new Map([['RFQ_2026', 50]]),
      rfqRecords: new Set(),
      quotationRecords: new Set(),
    };
    const tx = createMockTx(state);

    const id2026 = await db.getNextSequence(tx, 'RFQ', 'RFQ', 2026);
    const id2027 = await db.getNextSequence(tx, 'RFQ', 'RFQ', 2027);

    expect(id2026).toBe('RFQ-2026-0051');
    expect(id2027).toBe('RFQ-2027-0001');
    expect(state.sequences.get('RFQ_2026')).toBe(51);
    expect(state.sequences.get('RFQ_2027')).toBe(1);
  });

  it('6. should keep RFQ and QT sequences completely independent', async () => {
    const state: MockDbState = {
      sequences: new Map([
        ['RFQ_2026', 10],
        ['QT_2026', 3],
      ]),
      rfqRecords: new Set(),
      quotationRecords: new Set(),
    };
    const tx = createMockTx(state);

    const nextRfq = await db.getNextSequence(tx, 'RFQ', 'RFQ', 2026);
    const nextQt = await db.getNextSequence(tx, 'QT', 'QT', 2026);

    expect(nextRfq).toBe('RFQ-2026-0011');
    expect(nextQt).toBe('QT-2026-0004');
    expect(state.sequences.get('RFQ_2026')).toBe(11);
    expect(state.sequences.get('QT_2026')).toBe(4);
  });

  it('7. should allocate consecutive identifiers when serialized through mock transaction', async () => {
    const state: MockDbState = {
      sequences: new Map([['QT_2026', 0]]),
      rfqRecords: new Set(),
      quotationRecords: new Set(),
    };
    const tx = createMockTx(state);

    const results: string[] = [];
    for (let i = 0; i < 5; i++) {
      const id = await db.getNextSequence(tx, 'QT', 'QT', 2026);
      state.quotationRecords.add(id);
      results.push(id);
    }

    expect(results).toEqual([
      'QT-2026-0001',
      'QT-2026-0002',
      'QT-2026-0003',
      'QT-2026-0004',
      'QT-2026-0005',
    ]);
    expect(state.sequences.get('QT_2026')).toBe(5);
  });
});

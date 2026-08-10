/**
 * Unit tests for useTransactionStore.setTransactions (Fix A)
 *
 * Verifies merge (not replace) behavior across multi-server scenarios:
 *   1. Empty local + non-empty server → all server txs added.
 *   2. Non-empty local + empty server → all local txs preserved.
 *   3. Two server responses with different txs → merged (not overwritten).
 *   4. Same tx from two servers → server is authoritative (latest), no dupes.
 *   5. Local cleanedAt > server cleanedAt → keep local cleanedAt.
 *   6. Orphan (local-only) with cleanedAt → drop (already synced).
 *   7. Orphan (local-only) with paidAt > 0 → keep (unsynced payment).
 *   8. Orphan (local-only) with paidAt === 0 → drop (incomplete).
 *   9. Server list has internal duplicates → dedupe before merge.
 *  10. Final result is deduplicated by id.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useTransactionStore } from './useTransactionStore';
import type { Transaction } from '../types';

function makeTx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: Math.random().toString(36).substring(2, 11),
    roomId: 'room-001',
    roomName: 'Room 1',
    startTime: 1000,
    endTime: 2000,
    duration: 1000,
    pricePerHour: 50000,
    totalPrice: 50000,
    paidAt: 0,
    ...overrides,
  };
}

describe('useTransactionStore - Fix A: setTransactions merge', () => {
  beforeEach(() => {
    // Reset store between tests
    useTransactionStore.setState({ transactions: [] });
  });

  it('adds all server transactions when local is empty', () => {
    const { setTransactions } = useTransactionStore.getState();
    const serverTxs: Transaction[] = [
      makeTx({ id: 'tx-1', roomId: 'room-001' }),
      makeTx({ id: 'tx-2', roomId: 'room-002' }),
      makeTx({ id: 'tx-3', roomId: 'room-003' }),
    ];

    setTransactions(serverTxs);

    const { transactions } = useTransactionStore.getState();
    expect(transactions).toHaveLength(3);
    expect(transactions.map(t => t.id).sort()).toEqual(['tx-1', 'tx-2', 'tx-3']);
  });

  it('preserves all local transactions when server is empty (legacy mode, no sourceRoomId)', () => {
    const { setTransactions } = useTransactionStore.getState();
    useTransactionStore.setState({
      transactions: [
        makeTx({ id: 'local-1', roomId: 'room-001', paidAt: Date.now() }),
        makeTx({ id: 'local-2', roomId: 'room-002', paidAt: Date.now() }),
      ],
    });

    setTransactions([]);

    const { transactions } = useTransactionStore.getState();
    // Both paid transactions preserved (orphan kept when paidAt > 0)
    expect(transactions).toHaveLength(2);
  });

  it('merges two server responses without overwriting (multi-server scenario)', () => {
    const { setTransactions } = useTransactionStore.getState();

    // Server 1 sends its transactions (for room-001)
    const server1: Transaction[] = [
      makeTx({ id: 's1-tx-a', roomId: 'room-001' }),
      makeTx({ id: 's1-tx-b', roomId: 'room-001' }),
    ];
    setTransactions(server1, 'room-001');

    let state = useTransactionStore.getState();
    expect(state.transactions).toHaveLength(2);

    // Server 2 sends its transactions (for room-002) - with sourceRoomId so
    // cashier knows to preserve room-001 transactions as cross-server orphans
    const server2: Transaction[] = [
      makeTx({ id: 's2-tx-a', roomId: 'room-002' }),
      makeTx({ id: 's2-tx-b', roomId: 'room-002' }),
    ];
    setTransactions(server2, 'room-002');

    state = useTransactionStore.getState();
    // Both server1 AND server2 transactions should be present (merge, not replace)
    expect(state.transactions).toHaveLength(4);
    expect(state.transactions.map(t => t.id).sort()).toEqual([
      's1-tx-a',
      's1-tx-b',
      's2-tx-a',
      's2-tx-b',
    ]);
  });

  it('uses server as authoritative when same tx id from multiple sources', () => {
    const { setTransactions } = useTransactionStore.getState();

    const server1Tx = makeTx({
      id: 'tx-shared',
      roomId: 'room-001',
      totalPrice: 50000,
      paidAt: 0,
    });

    // Server1 first
    setTransactions([server1Tx]);
    let state = useTransactionStore.getState();
    expect(state.transactions).toHaveLength(1);
    expect(state.transactions[0].totalPrice).toBe(50000);

    // Server2 sends same tx with updated price (e.g., after payment)
    const server2Tx = makeTx({
      id: 'tx-shared',
      roomId: 'room-001',
      totalPrice: 50000,
      paidAt: Date.now(),
    });
    setTransactions([server2Tx]);

    state = useTransactionStore.getState();
    // Should still have 1 transaction, with paidAt from server2
    expect(state.transactions).toHaveLength(1);
    expect(state.transactions[0].paidAt).toBe(server2Tx.paidAt);
  });

  it('keeps local cleanedAt when local is newer than server', () => {
    const { setTransactions } = useTransactionStore.getState();

    // Step 1: server gives us a transaction
    const serverTx = makeTx({
      id: 'tx-clean-test',
      roomId: 'room-001',
      cleanedAt: undefined,
    });
    setTransactions([serverTx]);

    // Step 2: local marks it cleaned (newer timestamp)
    const localCleanedAt = Date.now();
    useTransactionStore.setState({
      transactions: [
        { ...serverTx, cleanedAt: localCleanedAt }
      ]
    });

    // Step 3: server sends updated transaction (without cleanedAt yet)
    setTransactions([makeTx({ id: 'tx-clean-test', roomId: 'room-001', cleanedAt: undefined })]);

    const state = useTransactionStore.getState();
    expect(state.transactions).toHaveLength(1);
    // Local cleanedAt should be preserved
    expect(state.transactions[0].cleanedAt).toBe(localCleanedAt);
  });

  it('drops orphan (local-only) with cleanedAt (already synced)', () => {
    const { setTransactions } = useTransactionStore.getState();

    // Set local-only cleaned transaction
    useTransactionStore.setState({
      transactions: [makeTx({
        id: 'local-cleaned',
        roomId: 'room-001',
        cleanedAt: Date.now(),
      })],
    });

    // Server returns empty list
    setTransactions([]);

    const state = useTransactionStore.getState();
    expect(state.transactions).toHaveLength(0);
  });

  it('keeps orphan (local-only) with paidAt > 0 (unsynced payment)', () => {
    const { setTransactions } = useTransactionStore.getState();

    useTransactionStore.setState({
      transactions: [makeTx({
        id: 'local-paid',
        roomId: 'room-001',
        paidAt: Date.now(),
      })],
    });

    setTransactions([]);

    const state = useTransactionStore.getState();
    expect(state.transactions).toHaveLength(1);
    expect(state.transactions[0].id).toBe('local-paid');
  });

  it('drops orphan (local-only) with paidAt === 0 (incomplete)', () => {
    const { setTransactions } = useTransactionStore.getState();

    useTransactionStore.setState({
      transactions: [makeTx({
        id: 'local-incomplete',
        roomId: 'room-001',
        paidAt: 0,
      })],
    });

    setTransactions([]);

    const state = useTransactionStore.getState();
    expect(state.transactions).toHaveLength(0);
  });

  it('deduplicates server list before merge (keep first occurrence)', () => {
    const { setTransactions } = useTransactionStore.getState();

    const serverTxs: Transaction[] = [
      makeTx({ id: 'tx-dup', roomId: 'room-001', totalPrice: 50000 }),
      makeTx({ id: 'tx-dup', roomId: 'room-001', totalPrice: 60000 }), // dup
      makeTx({ id: 'tx-other', roomId: 'room-002' }),
    ];

    setTransactions(serverTxs);

    const state = useTransactionStore.getState();
    // Should have 2 unique transactions, not 3
    expect(state.transactions).toHaveLength(2);
    const txDup = state.transactions.find(t => t.id === 'tx-dup');
    expect(txDup).toBeDefined();
    expect(txDup?.totalPrice).toBe(50000); // first occurrence wins
  });

  it('final result is deduplicated by id (defensive)', () => {
    const { setTransactions } = useTransactionStore.getState();

    // Manually create local with potential duplicate
    useTransactionStore.setState({
      transactions: [
        makeTx({ id: 'tx-1', roomId: 'room-001' }),
        makeTx({ id: 'tx-1', roomId: 'room-001' }), // intentional dup
      ],
    });

    setTransactions([
      makeTx({ id: 'tx-1', roomId: 'room-001' }),
      makeTx({ id: 'tx-2', roomId: 'room-002' }),
    ]);

    const state = useTransactionStore.getState();
    const ids = state.transactions.map(t => t.id);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2); // all unique
  });

  it('preserves transactions from different rooms after merge (with sourceRoomId)', () => {
    const { setTransactions } = useTransactionStore.getState();

    setTransactions([makeTx({ id: 'tx-001', roomId: 'room-001' })], 'room-001');
    setTransactions(
      [
        makeTx({ id: 'tx-002', roomId: 'room-002' }),
        makeTx({ id: 'tx-003', roomId: 'room-003' }),
      ],
      'room-002',
    );

    const state = useTransactionStore.getState();
    const roomIds = state.transactions.map(t => t.roomId).sort();
    expect(roomIds).toContain('room-001');
    expect(roomIds).toContain('room-002');
    expect(roomIds).toContain('room-003');
  });
});

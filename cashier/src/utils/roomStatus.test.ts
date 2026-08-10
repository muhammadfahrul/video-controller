/**
 * Regression test: after Move Room, the source room must show 'BERSIHKAN'
 * first (not immediately 'SUDAH DIBERSIHKAN'), and the activate button stays
 * disabled until it's actually cleaned.
 *
 * Root cause: getRoomStatus() checked getPaidCleaningStatus() (keyed off the
 * room's transaction history) before getMovedOutCleaningStatus() (keyed off
 * roomBilling.needsCleaning/lastTransactionEndTime, which the server sets
 * fresh on every move). A Move Room deactivation deliberately records no
 * transaction for the source room, so getPaidCleaningStatus() would fall back
 * to whatever the room's PREVIOUS (unrelated) transaction was - if that had
 * been paid 30-60 minutes ago, it short-circuited straight to
 * 'SUDAH DIBERSIHKAN' via stale data instead of consulting the fresh move
 * timestamp at all.
 */
import { describe, it, expect } from 'vitest';
import { getRoomStatus } from './roomStatus';
import type { RoomBilling, Transaction } from '../types';

function makeBilling(overrides: Partial<RoomBilling> = {}): RoomBilling {
  return {
    roomId: 'room-001',
    roomName: 'Room 1',
    startTime: null,
    currentDuration: 0,
    totalPrice: 0,
    status: 'idle',
    isActive: false,
    expiresAt: null,
    isConnected: true,
    needsCleaning: false,
    ...overrides,
  };
}

function makeTx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tx-1',
    roomId: 'room-001',
    roomName: 'Room 1',
    startTime: 0,
    endTime: 0,
    duration: 0,
    pricePerHour: 50000,
    totalPrice: 50000,
    paidAt: 0,
    ...overrides,
  };
}

describe('getRoomStatus - Move Room cleaning status priority', () => {
  it('shows BERSIHKAN right after a move, even if a prior unrelated transaction was paid 45 min ago', () => {
    const now = Date.now();
    const billing = makeBilling({
      needsCleaning: true,
      lastTransactionEndTime: now, // move just happened
    });
    // A previous, unrelated customer's transaction, paid 45 minutes ago -
    // this used to hijack the status via getPaidCleaningStatus().
    const transactions = [
      makeTx({ id: 'prev-tx', paidAt: now - 45 * 60 * 1000, cleanedAt: undefined }),
    ];

    expect(getRoomStatus(billing, transactions).label).toBe('BERSIHKAN');
  });

  it('moves from BERSIHKAN to SUDAH DIBERSIHKAN after 30 minutes since the move', () => {
    const now = Date.now();
    const billing = makeBilling({
      needsCleaning: true,
      lastTransactionEndTime: now - 31 * 60 * 1000,
    });

    expect(getRoomStatus(billing, []).label).toBe('SUDAH DIBERSIHKAN');
  });

  it('falls back to ONLINE more than 60 minutes after the move', () => {
    const now = Date.now();
    const billing = makeBilling({
      needsCleaning: true,
      lastTransactionEndTime: now - 61 * 60 * 1000,
    });

    expect(getRoomStatus(billing, []).label).toBe('ONLINE');
  });

  it('still uses paid-transaction cleaning status for the normal (non-move) flow', () => {
    const now = Date.now();
    const billing = makeBilling({ needsCleaning: false });
    const transactions = [makeTx({ paidAt: now - 5 * 60 * 1000 })];

    expect(getRoomStatus(billing, transactions).label).toBe('BERSIHKAN');
  });

  it('shows UNPAID before any cleaning status, even if needsCleaning is set', () => {
    const billing = makeBilling({ needsCleaning: true, lastTransactionEndTime: Date.now() });
    const transactions = [makeTx({ paidAt: 0 })];

    expect(getRoomStatus(billing, transactions).label).toBe('UNPAID');
  });
});

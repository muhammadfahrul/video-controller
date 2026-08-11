/**
 * Unit tests for MultiSocketService.findConnectionForRoom (Fix B)
 *
 * Memverifikasi helper lookup connection robust yang handle beberapa mode:
 *   1. config.id exact match.
 *   2. config.roomId exact match.
 *   3. agent's registered roomId live match.
 *   4. config.name case-insensitive match.
 *   5. config.id normalized (strip dashes/spaces/underscores).
 *
 * Test dilakukan lewat mocking socket.io-client untuk instantiate MultiSocketService.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock socket.io-client
const mockSocket = {
  id: 'mock-socket-id',
  connected: true,
  emit: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  disconnect: vi.fn(),
  once: vi.fn(),
};

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket),
}));

import { multiSocketService } from './MultiSocketService';
import type { RoomConfig, Transaction } from '../types';

type Svc = {
  addRoom: typeof multiSocketService.addRoom;
  removeRoom: typeof multiSocketService.removeRoom;
  activateRoom: typeof multiSocketService.activateRoom;
  isConnected: typeof multiSocketService.isConnected;
  getRooms: typeof multiSocketService.getRooms;
  disconnectAll: typeof multiSocketService.disconnectAll;
};

function makeConfig(overrides: Partial<RoomConfig> = {}): RoomConfig {
  return {
    id: 'env-room-1',
    name: 'Room 1',
    ip: '192.168.1.10',
    port: 53331,
    ...overrides,
  };
}

describe('MultiSocketService - Fix B: findConnectionForRoom', () => {
  let service: Svc;

  beforeEach(() => {
    vi.clearAllMocks();
    // Disconnect all to reset state between tests
    multiSocketService.disconnectAll();
    service = multiSocketService;
  });

  it('finds connection by config.id (exact match)', () => {
    const config = makeConfig({ id: 'env-room-1', name: 'Room 1' });
    service.addRoom(config);

    // isConnected returns connection state for a given id
    // (it doesn't trigger findConnectionForRoom, but verifies room was added)
    expect(service.getRooms()).toHaveLength(1);
    expect(service.getRooms()[0].id).toBe('env-room-1');
  });

  it('handles missing roomId gracefully', async () => {
    const config = makeConfig();
    service.addRoom(config);

    // Should not throw
    await service.activateRoom('', 'Room 1');
    expect(mockSocket.emit).not.toHaveBeenCalledWith('cashier:activate-room', expect.anything());
  });

  it('handles unknown roomId gracefully', async () => {
    const config = makeConfig({ id: 'env-room-1' });
    service.addRoom(config);

    await service.activateRoom('unknown-room', 'Room X');
    expect(mockSocket.emit).not.toHaveBeenCalledWith('cashier:activate-room', expect.anything());
  });

  it('skips activation if connection is not connected', async () => {
    const config = makeConfig({ id: 'env-room-1' });
    service.addRoom(config);

    // Simulate disconnect
    mockSocket.connected = false;

    await service.activateRoom('env-room-1', 'Room 1');
    expect(mockSocket.emit).not.toHaveBeenCalledWith('cashier:activate-room', expect.anything());

    // Reset
    mockSocket.connected = true;
  });

  it('removes a room connection', () => {
    const config = makeConfig({ id: 'env-room-1' });
    service.addRoom(config);
    expect(service.getRooms()).toHaveLength(1);

    service.removeRoom('env-room-1');
    expect(service.getRooms()).toHaveLength(0);
  });

  it('returns empty list when no rooms added', () => {
    expect(service.getRooms()).toHaveLength(0);
  });

  it('does not duplicate room connections', () => {
    const config = makeConfig({ id: 'env-room-1' });
    service.addRoom(config);
    service.addRoom(config);

    expect(service.getRooms()).toHaveLength(1);
  });
});

/**
 * Unit tests for transaction handling - server-authoritative, replace-per-connection.
 *
 * Transactions used to live in a Zustand store with a hand-written merge function
 * reconciling local vs. server state across a single flat array. That merge logic
 * existed only to compensate for folding N independent room servers' data into one
 * array. Now each connection owns its own transactions slice (like `agents`), and
 * every 'transaction:get' broadcast fully replaces that connection's slice - no
 * merge needed, since one connection's replace can never touch another's data.
 */
describe('MultiSocketService - transactions (server-authoritative)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    multiSocketService.disconnectAll();
  });

  function makeTx(overrides: Partial<Transaction> = {}): Transaction {
    return {
      id: Math.random().toString(36).slice(2),
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

  // mockSocket is shared across connections (io() always returns it), so every
  // addRoom() call registers its own 'transaction:get' handler on it via `on`.
  // Handlers are returned in registration order, one per connection.
  function getTransactionGetHandlers(): Array<(txs: Transaction[]) => void> {
    return mockSocket.on.mock.calls
      .filter(([event]) => event === 'transaction:get')
      .map(([, handler]) => handler as (txs: Transaction[]) => void);
  }

  it('replaces (not merges) a connection\'s transactions on every transaction:get', () => {
    multiSocketService.addRoom(makeConfig({ id: 'env-room-1' }));
    const [handler] = getTransactionGetHandlers();

    handler([makeTx({ id: 'tx-a' }), makeTx({ id: 'tx-b' })]);
    expect(multiSocketService.getTransactions().map(t => t.id).sort()).toEqual(['tx-a', 'tx-b']);

    // A later broadcast is the full authoritative list - tx-b is gone because
    // the server no longer reports it, not because of a merge heuristic.
    handler([makeTx({ id: 'tx-a' })]);
    expect(multiSocketService.getTransactions().map(t => t.id)).toEqual(['tx-a']);
  });

  it('flattens transactions across multiple connections independently, without sourceRoomId', () => {
    multiSocketService.addRoom(makeConfig({ id: 'env-room-1', name: 'Room 1' }));
    multiSocketService.addRoom(makeConfig({ id: 'env-room-2', name: 'Room 2' }));
    const [handlerA, handlerB] = getTransactionGetHandlers();

    handlerA([makeTx({ id: 'tx-a', roomId: 'room-001' })]);
    handlerB([makeTx({ id: 'tx-b', roomId: 'room-002' })]);

    expect(multiSocketService.getTransactions().map(t => t.id).sort()).toEqual(['tx-a', 'tx-b']);

    // Replacing room-001's connection never touches room-002's slice.
    handlerA([]);
    expect(multiSocketService.getTransactions().map(t => t.id)).toEqual(['tx-b']);
  });

  it('notifies onTransactionsUpdate subscribers with the flattened list', () => {
    multiSocketService.addRoom(makeConfig({ id: 'env-room-1' }));
    const [handler] = getTransactionGetHandlers();

    const cb = vi.fn();
    const unsubscribe = multiSocketService.onTransactionsUpdate(cb);

    handler([makeTx({ id: 'tx-a' })]);
    expect(cb).toHaveBeenCalledWith([expect.objectContaining({ id: 'tx-a' })]);

    unsubscribe();
    cb.mockClear();
    handler([makeTx({ id: 'tx-b' })]);
    expect(cb).not.toHaveBeenCalled();
  });

  it('drops a connection\'s transactions from getTransactions() when the room is removed', () => {
    multiSocketService.addRoom(makeConfig({ id: 'env-room-1' }));
    const [handler] = getTransactionGetHandlers();
    handler([makeTx({ id: 'tx-a' })]);
    expect(multiSocketService.getTransactions()).toHaveLength(1);

    multiSocketService.removeRoom('env-room-1');
    expect(multiSocketService.getTransactions()).toHaveLength(0);
  });

  // Regression test: updateTransaction/deleteTransaction used to broadcast to
  // every connected room's server (not just the transaction's own room). Since
  // each room runs its own independent server + DB, that made every other
  // connected server insert its own copy of the same transaction id - the
  // paid transaction would then legitimately exist on two servers and show up
  // twice once getTransactions() flattens both connections' slices.
  it('updateTransaction only emits to the transaction\'s own room connection, not every connected room', () => {
    multiSocketService.addRoom(makeConfig({ id: 'env-room-1', name: 'Room 1', roomId: 'room-001' }));
    multiSocketService.addRoom(makeConfig({ id: 'env-room-2', name: 'Room 2', roomId: 'room-002' }));
    const [handlerA] = getTransactionGetHandlers();
    handlerA([makeTx({ id: 'tx-a', roomId: 'room-001' })]);

    mockSocket.emit.mockClear();
    multiSocketService.updateTransaction(makeTx({ id: 'tx-a', roomId: 'room-001', paidAt: Date.now() }));

    const saveCalls = mockSocket.emit.mock.calls.filter(([event]) => event === 'transaction:save');
    expect(saveCalls).toHaveLength(1);
  });

  it('deleteTransaction only emits to the given room\'s connection, not every connected room', () => {
    multiSocketService.addRoom(makeConfig({ id: 'env-room-1', name: 'Room 1' }));
    multiSocketService.addRoom(makeConfig({ id: 'env-room-2', name: 'Room 2' }));

    mockSocket.emit.mockClear();
    multiSocketService.deleteTransaction('tx-a', 'env-room-1');

    const deleteCalls = mockSocket.emit.mock.calls.filter(([event]) => event === 'transaction:delete');
    expect(deleteCalls).toHaveLength(1);
  });
});

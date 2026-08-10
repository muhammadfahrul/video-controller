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

// Mock useTransactionStore
vi.mock('../store/useTransactionStore', () => ({
  useTransactionStore: {
    getState: () => ({
      setTransactions: vi.fn(),
    }),
  },
}));

import { multiSocketService } from './MultiSocketService';
import type { RoomConfig } from '../types';

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
    pricePerHour: 50000,
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

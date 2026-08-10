/**
 * Unit tests for AgentRegistry
 *
 * Covers Fix C: registry key by roomId with secondary index by agent.id.
 *
 * Topologi (lihat PRD §1): 1 server = 1 agent per roomId. Tests verify:
 *   1. Register + lookup by roomId.
 *   2. Register + lookup by agent.id (backward-compat via secondary index).
 *   3. Register replaces existing entry untuk roomId yang sama (reconnect scenario).
 *   4. updateHeartbeat resolves via both roomId dan agent.id.
 *   5. removeBySocket cleans up secondary index.
 *   6. getAll returns cloned data (no shared references).
 *   7. updateSnapshot works by roomId.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { AgentRegistry } from './AgentRegistry';
import type { AgentInfo } from '../types/Agent';

function makeAgent(overrides: Partial<AgentInfo> = {}): AgentInfo {
  return {
    id: 'agent-room-001',
    socketId: 'socket-001',
    name: 'Room 1 Agent',
    roomId: 'room-001',
    roomName: 'Room 1',
    status: 'ONLINE',
    lastHeartbeat: Date.now(),
    connectedAt: Date.now(),
    isActive: false,
    startTime: null,
    expiresAt: null,
    ...overrides,
  };
}

describe('AgentRegistry', () => {
  let registry: AgentRegistry;

  beforeEach(() => {
    registry = new AgentRegistry();
  });

  describe('Fix C: register + lookup by roomId', () => {
    it('registers an agent and retrieves it by roomId', () => {
      const agent = makeAgent();
      registry.register(agent);

      const found = registry.get('room-001');
      expect(found).toBeDefined();
      expect(found?.roomId).toBe('room-001');
      expect(found?.id).toBe('agent-room-001');
    });

    it('registers an agent and retrieves it by agent.id (backward-compat)', () => {
      const agent = makeAgent();
      registry.register(agent);

      const found = registry.get('agent-room-001');
      expect(found).toBeDefined();
      expect(found?.roomId).toBe('room-001');
      expect(found?.id).toBe('agent-room-001');
    });

    it('returns undefined for unknown keys', () => {
      expect(registry.get('unknown-room')).toBeUndefined();
      expect(registry.get('unknown-agent')).toBeUndefined();
    });
  });

  describe('Fix C: replace existing entry on reconnect', () => {
    it('replaces existing agent for same roomId (reconnect scenario)', () => {
      // Initial connect
      registry.register(makeAgent({ socketId: 'socket-old', lastHeartbeat: 1000 }));
      // Reconnect with new socketId
      registry.register(makeAgent({ socketId: 'socket-new', lastHeartbeat: 2000 }));

      const all = registry.getAll();
      expect(all).toHaveLength(1);
      expect(all[0].socketId).toBe('socket-new');
      expect(all[0].lastHeartbeat).toBe(2000);
    });

    it('can lookup by old agent.id even after replace (backward-compat)', () => {
      // Same roomId & agent.id, but new socket (reconnect)
      registry.register(makeAgent({ socketId: 'socket-old' }));
      registry.register(makeAgent({ socketId: 'socket-new' }));

      // Should still resolve via agent.id
      const found = registry.getRef('agent-room-001');
      expect(found?.socketId).toBe('socket-new');
    });
  });

  describe('Fix C: updateHeartbeat resolves via both keys', () => {
    it('updates heartbeat via roomId', () => {
      registry.register(makeAgent({ lastHeartbeat: 1000 }));
      registry.updateHeartbeat('room-001');

      const agent = registry.get('room-001');
      expect(agent?.lastHeartbeat).toBeGreaterThan(1000);
    });

    it('updates heartbeat via agent.id (backward-compat)', () => {
      registry.register(makeAgent({ lastHeartbeat: 1000 }));
      registry.updateHeartbeat('agent-room-001');

      const agent = registry.get('room-001');
      expect(agent?.lastHeartbeat).toBeGreaterThan(1000);
    });

    it('updates status from OFFLINE to ONLINE on heartbeat', () => {
      registry.register(makeAgent({ status: 'OFFLINE' }));
      registry.updateHeartbeat('room-001');

      const agent = registry.getRef('room-001');
      expect(agent?.status).toBe('ONLINE');
    });

    it('does nothing for unknown key', () => {
      registry.updateHeartbeat('unknown-room');
      // Should not throw
      expect(registry.getAll()).toHaveLength(0);
    });
  });

  describe('Fix C: removeBySocket', () => {
    it('removes agent by socketId and cleans secondary index', () => {
      registry.register(makeAgent({ socketId: 'socket-001' }));
      registry.register(makeAgent({
        id: 'agent-room-002',
        socketId: 'socket-002',
        roomId: 'room-002',
        roomName: 'Room 2',
      }));

      registry.removeBySocket('socket-001');

      expect(registry.getAll()).toHaveLength(1);
      expect(registry.get('room-001')).toBeUndefined();
      expect(registry.get('agent-room-001')).toBeUndefined(); // secondary index cleaned
      expect(registry.get('room-002')).toBeDefined();
    });
  });

  describe('Fix C: getAll returns cloned data', () => {
    it('returned array items are clones, not references', () => {
      const agent = makeAgent();
      registry.register(agent);

      const all1 = registry.getAll();
      const all2 = registry.getAll();

      expect(all1[0]).not.toBe(all2[0]); // different objects
      expect(all1[0]).toEqual(all2[0]); // same data
    });
  });

  describe('Fix C: updateSnapshot', () => {
    it('updates snapshot by roomId', () => {
      registry.register(makeAgent());

      registry.updateSnapshot('room-001', {
        player: { state: 'playing', videoId: 'abc123', title: 'Test' } as any,
        playlist: { items: [], currentIndex: -1, repeat: 'off', shuffle: false } as any,
      });

      const agent = registry.get('room-001');
      expect(agent?.player?.videoId).toBe('abc123');
    });

    it('updates snapshot by agent.id (backward-compat)', () => {
      registry.register(makeAgent());

      registry.updateSnapshot('agent-room-001', {
        player: { state: 'paused', videoId: 'xyz789' } as any,
        playlist: { items: [], currentIndex: -1, repeat: 'off', shuffle: false } as any,
      });

      const agent = registry.get('room-001');
      expect(agent?.player?.videoId).toBe('xyz789');
    });
  });

  describe('Fix C: setActive by both keys', () => {
    it('activates agent by roomId', () => {
      registry.register(makeAgent({ isActive: false }));
      registry.setActive('room-001', true);

      expect(registry.getRef('room-001')?.isActive).toBe(true);
    });

    it('activates agent by agent.id (backward-compat)', () => {
      registry.register(makeAgent({ isActive: false }));
      registry.setActive('agent-room-001', true);

      expect(registry.getRef('room-001')?.isActive).toBe(true);
    });
  });

  describe('Fix C: getByRoomIdRef for mutation', () => {
    it('returns actual reference (not clone) - mutations persist', () => {
      registry.register(makeAgent());

      const ref = registry.getByRoomIdRef('room-001');
      ref!.expiresAt = 99999;

      // Subsequent get should see mutation
      const found = registry.get('room-001');
      expect(found?.expiresAt).toBe(99999);
    });

    it('getByRoomId returns clone (mutations do not persist)', () => {
      registry.register(makeAgent());

      const clone = registry.getByRoomId('room-001');
      clone!.expiresAt = 99999;

      // get() should not see mutation
      const found = registry.get('room-001');
      expect(found?.expiresAt).toBeNull();
    });
  });

  describe('Fix C: getBySocket', () => {
    it('finds agent by socketId', () => {
      registry.register(makeAgent({ socketId: 'socket-xyz' }));

      const found = registry.getBySocket('socket-xyz');
      expect(found?.roomId).toBe('room-001');
    });

    it('returns undefined for unknown socketId', () => {
      registry.register(makeAgent({ socketId: 'socket-xyz' }));

      expect(registry.getBySocket('socket-other')).toBeUndefined();
    });
  });

  describe('Fix C: empty roomId fallback to agent.id', () => {
    it('uses agent.id as key when roomId is empty', () => {
      registry.register(makeAgent({ id: 'agent-fallback', roomId: '' }));

      // Lookup by agent.id should work
      const found = registry.get('agent-fallback');
      expect(found).toBeDefined();
      expect(found?.roomId).toBe('');
    });
  });
});

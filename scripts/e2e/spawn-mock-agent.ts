/**
 * Helper: spawn mock agent yang connect ke server dan register.
 *
 * Mock agent lebih ringan dari real agent (no Playwright), tapi punya:
 *   - Register dengan roomId & roomName
 *   - Heartbeat periodic
 *   - Listen 'agent:activation' events
 *
 * Real agent test ada di integration test terpisah.
 */
import { io as ioClient, Socket } from 'socket.io-client';

export interface MockAgentOptions {
  serverUrl: string;
  roomId: string;
  roomName: string;
  heartbeatIntervalMs?: number;
}

export interface MockAgentHandle {
  socket: Socket;
  roomId: string;
  roomName: string;
  isActive: boolean;
  activationPromise: Promise<{ isActive: boolean }>;

  disconnect(): void;
}

export function spawnMockAgent(opts: MockAgentOptions): MockAgentHandle {
  const socket = ioClient(opts.serverUrl, {
    transports: ['websocket', 'polling'],
    reconnection: false,
    timeout: 5000,
  });

  let resolveActivation!: (value: { isActive: boolean }) => void;
  const activationPromise = new Promise<{ isActive: boolean }>((resolve) => {
    resolveActivation = resolve;
  });

  let isActive = false;
  const heartbeatId = opts.heartbeatIntervalMs ?? 2000;

  socket.once('connect', () => {
    socket.emit('agent:register', {
      id: `agent-${opts.roomId}`,
      name: `${opts.roomName} Agent`,
      roomId: opts.roomId,
      roomName: opts.roomName,
    });

    setInterval(() => {
      socket.emit('agent:heartbeat', { id: `agent-${opts.roomId}` });
    }, heartbeatId);
  });

  socket.on('agent:activation', (data: { isActive: boolean }) => {
    isActive = data.isActive;
    resolveActivation({ isActive });
  });

  return {
    socket,
    roomId: opts.roomId,
    roomName: opts.roomName,
    get isActive() {
      return isActive;
    },
    activationPromise,
    disconnect() {
      socket.disconnect();
    },
  };
}

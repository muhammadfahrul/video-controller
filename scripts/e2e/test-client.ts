/**
 * Helper: simulate a cashier-like client that connects ke multiple server rooms.
 *
 * Karena cashier adalah Vite SPA (browser-only), kita tidak bisa langsung spawn
 * cashier process. Sebagai gantinya, helper ini simulate perilaku cashier dengan:
 *   - MultiSocketService-style: 1 socket per room config entry.
 *   - Track semua agent registrations.
 *   - Track semua transactions (merge logic).
 *   - Emit cashier:* events ke server yg sesuai.
 *
 * Ini mereplikasi logika `MultiSocketService` di cashier tanpa browser dependency.
 */
import { io as ioClient, Socket } from 'socket.io-client';

export interface RoomConfig {
  id: string;
  name: string;
  roomId?: string;
  ip: string;
  port: number;
}

export interface CashierClientHandle {
  connections: Map<string, { socket: Socket; config: RoomConfig }>;
  agents: Map<string, any>; // roomId -> agent info
  transactions: Map<string, any[]>; // roomId -> transactions
  events: Array<{ ts: number; type: string; data: any }>;

  activateRoom(roomId: string, roomName: string, durationMinutes?: number): Promise<void>;
  deactivateRoom(roomId: string): Promise<void>;
  loadTransactions(roomId: string): Promise<any[]>;
  waitForAgentRegistered(roomId: string, timeoutMs?: number): Promise<any>;
  disconnectAll(): Promise<void>;
}

export async function createCashierLikeClient(configs: RoomConfig[]): Promise<CashierClientHandle> {
  const connections = new Map<string, { socket: Socket; config: RoomConfig }>();
  const agents = new Map<string, any>();
  const transactionsByRoom = new Map<string, any[]>();
  const events: Array<{ ts: number; type: string; data: any }> = [];
  const waiters = new Map<string, Array<(data: any) => void>>();

  function emit(type: string, data: any) {
    events.push({ ts: Date.now(), type, data });
    if (process.env.E2E_VERBOSE) {
      console.log(`[cashier]`, type, JSON.stringify(data).slice(0, 200));
    }
    const waitersForType = waiters.get(type);
    if (waitersForType) {
      waitersForType.forEach((fn) => fn(data));
      waiters.set(type, []);
    }
  }

  function resolveConnection(roomId: string): { socket: Socket; config: RoomConfig } | undefined {
    if (connections.has(roomId)) return connections.get(roomId)!;

    const targetLower = roomId.toLowerCase();
    for (const conn of connections.values()) {
      if (conn.config.roomId === roomId) return conn;
      if (conn.config.id === roomId) return conn;
      if (conn.config.name?.toLowerCase() === targetLower) return conn;
    }
    return undefined;
  }

  // Open 1 socket per room config (mirrors MultiSocketService.addRoom)
  await Promise.all(
    configs.map(
      (config) =>
        new Promise<void>((resolve, reject) => {
          const url = `http://${config.ip}:${config.port}`;
          const socket = ioClient(url, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 500,
            reconnectionAttempts: 10,
            timeout: 5000,
          });

          const timeoutId = setTimeout(() => {
            socket.disconnect();
            reject(new Error(`Failed to connect to ${url} within 5s`));
          }, 5000);

          socket.once('connect', () => {
            clearTimeout(timeoutId);
            connections.set(config.id, { socket, config });
            emit('connect', { roomId: config.id, url });

            // Subscribe ke server events
            socket.on('agent:register', (agent: any) => {
              agents.set(agent.roomId, agent);
              emit('agent:register', agent);
            });

            socket.on('agent:heartbeat', (data: any) => {
              if (data.agent) agents.set(data.agent.roomId, data.agent);
              emit('agent:heartbeat', data);
            });

            socket.on('agents:update', (agentList: any[]) => {
              agentList.forEach((a) => agents.set(a.roomId, a));
              emit('agents:update', agentList);
            });

            socket.on('room:activation', (data: any) => {
              emit('room:activation', data);

              // Mirrors MultiSocketService behavior: create transaction on deactivation.
              // Real cashier creates a transaction locally and sends it via transaction:save.
              if (data.isActive === false && data.roomId) {
                const agent = agents.get(data.roomId);
                const startTime = data.startTime ?? agent?.startTime ?? 0;
                const expiresAt = data.expiresAt ?? agent?.expiresAt;
                const endTime = expiresAt ?? Date.now();
                const durationSeconds = Math.max(0, Math.floor((endTime - startTime) / 1000));
                const pricePerHour = agent?.pricePerHour ?? 50000;
                const totalPrice = Math.max(0, Math.ceil(durationSeconds / 3600) * pricePerHour);

                if (startTime > 0 && durationSeconds > 0) {
                  const txId = `tx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
                  const tx = {
                    id: txId,
                    roomId: data.roomId,
                    roomName: data.roomName ?? agent?.roomName ?? config.name,
                    customerName: agent?.customerName,
                    customerPhone: agent?.customerPhone,
                    customerEmail: agent?.customerEmail,
                    customerNote: agent?.customerNote,
                    startTime,
                    endTime,
                    duration: durationSeconds,
                    pricePerHour,
                    totalPrice,
                    paidAt: 0,
                  };

                  const current = transactionsByRoom.get(config.roomId ?? data.roomId) ?? [];
                  transactionsByRoom.set(config.roomId ?? data.roomId, [tx, ...current]);

                  // Persist to server
                  socket.emit('transaction:save', tx);
                  emit('transaction:created', tx);
                }
              }
            });

            socket.on('transaction:get', (txList: any[]) => {
              // Fix A logic: merge by sourceRoomId
              const sourceRoomId = config.roomId;
              const current = transactionsByRoom.get(sourceRoomId) ?? [];
              const serverMap = new Map(txList.map((t) => [t.id, t]));
              const merged: any[] = [...current];

              current.forEach((local) => {
                if (!serverMap.has(local.id) && !local.cleanedAt && local.paidAt > 0) {
                  // Keep paid orphan
                } else if (!serverMap.has(local.id)) {
                  // Remove orphan (different room)
                  const idx = merged.findIndex((m) => m.id === local.id);
                  if (idx >= 0 && local.roomId !== sourceRoomId) merged.splice(idx, 1);
                }
              });

              txList.forEach((tx) => {
                if (!merged.find((m) => m.id === tx.id)) merged.push(tx);
                else {
                  const idx = merged.findIndex((m) => m.id === tx.id);
                  merged[idx] = tx;
                }
              });

              transactionsByRoom.set(sourceRoomId, merged);
              emit('transaction:get', { sourceRoomId, count: merged.length });
            });

            socket.emit('cashier:request-agents');
            resolve();
          });

          socket.once('connect_error', (err) => {
            clearTimeout(timeoutId);
            reject(err);
          });
        })
    )
  );

  const handle: CashierClientHandle = {
    connections,
    get agents() {
      return agents;
    },
    get transactions() {
      // Flat list across all rooms (mirrors useTransactionStore)
      const all: any[] = [];
      transactionsByRoom.forEach((txs) => all.push(...txs));
      return transactionsByRoom as any;
    },
    events,

    async activateRoom(roomId, roomName, durationMinutes) {
      const conn = resolveConnection(roomId);
      if (!conn) throw new Error(`No connection for room ${roomId}`);
      if (!conn.socket.connected) throw new Error(`Connection not ready for ${roomId}`);

      return new Promise<void>((resolve) => {
        const onActivation = (data: any) => {
          if (data.roomId === roomId) {
            conn.socket.off('room:activation', onActivation);
            resolve();
          }
        };
        conn.socket.on('room:activation', onActivation);
        conn.socket.emit('cashier:activate-room', {
          roomId,
          roomName,
          durationMinutes,
        });

        // Timeout fallback
        setTimeout(() => {
          conn.socket.off('room:activation', onActivation);
          resolve();
        }, 3000);
      });
    },

    async deactivateRoom(roomId) {
      const conn = resolveConnection(roomId);
      if (!conn) throw new Error(`No connection for room ${roomId}`);

      return new Promise<void>((resolve) => {
        const onDeactivation = (data: any) => {
          if (data.roomId === roomId) {
            conn.socket.off('room:activation', onDeactivation);
            resolve();
          }
        };
        conn.socket.on('room:activation', onDeactivation);
        conn.socket.emit('cashier:deactivate-room', { roomId });

        setTimeout(() => {
          conn.socket.off('room:activation', onDeactivation);
          resolve();
        }, 3000);
      });
    },

    async loadTransactions(roomId) {
      const conn = resolveConnection(roomId);
      if (!conn) throw new Error(`No connection for room ${roomId}`);

      return new Promise((resolve) => {
        const onTx = (data: any) => {
          if (data.sourceRoomId === roomId || data.sourceRoomId === conn.config.roomId) {
            conn.socket.off('transaction:get', onTx);
            const txs = transactionsByRoom.get(conn.config.roomId ?? roomId) ?? [];
            resolve(txs);
          }
        };
        conn.socket.on('transaction:get', onTx);
        conn.socket.emit('transaction:get');

        setTimeout(() => {
          conn.socket.off('transaction:get', onTx);
          resolve(transactionsByRoom.get(conn.config.roomId ?? roomId) ?? []);
        }, 3000);
      });
    },

    async waitForAgentRegistered(roomId, timeoutMs = 5000) {
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        if (agents.has(roomId)) return agents.get(roomId);
        await new Promise((r) => setTimeout(r, 100));
      }
      throw new Error(`Agent for room ${roomId} not registered within ${timeoutMs}ms`);
    },

    async disconnectAll() {
      const promises: Promise<void>[] = [];
      connections.forEach(({ socket }) => {
        promises.push(
          new Promise<void>((resolve) => {
            if (socket.connected) {
              socket.once('disconnect', () => resolve());
              socket.disconnect();
            } else {
              resolve();
            }
          })
        );
      });
      await Promise.all(promises);
    },
  };

  return handle;
}

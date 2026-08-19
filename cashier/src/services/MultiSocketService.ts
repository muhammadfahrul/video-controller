import { io, Socket } from 'socket.io-client';
import type { AgentInfo, PlayerState, RoomConfig, RoomBilling, Transaction } from '../types';

type RoomUpdateCallback = (rooms: Map<string, RoomBilling>) => void;
type ConnectionStatusCallback = (roomId: string, connected: boolean) => void;
type ExpiryWarningCallback = (data: { roomId: string; secondsRemaining: number; expiresAt: number }) => void;
type TransactionsUpdateCallback = (transactions: Transaction[]) => void;

interface RoomConnection {
  socket: Socket;
  config: RoomConfig;
  agents: AgentInfo[];
  // Queue to process agent updates sequentially to prevent race conditions
  agentUpdateQueue: Promise<void>;
  // Track last update timestamp to handle out-of-order events
  lastAgentUpdate: number;
  // Transactions as last reported by this connection's server (authoritative,
  // replaced wholesale on every 'transaction:get' - never merged).
  transactions: Transaction[];
}

class MultiSocketService {
  private connections: Map<string, RoomConnection> = new Map();
  private updateCallbacks: RoomUpdateCallback[] = [];
  private statusCallbacks: ConnectionStatusCallback[] = [];
  private expiryWarningCallbacks: ExpiryWarningCallback[] = [];
  private transactionsUpdateCallbacks: TransactionsUpdateCallback[] = [];
  private maxReconnectAttempts = 10;

  // Add a new room connection
  addRoom(config: RoomConfig, onConnected?: () => void): void {
    if (this.connections.has(config.id)) {
      console.log('[MultiSocket] Room already connected:', config.id);
      onConnected?.();
      return;
    }

    const url = `http://${config.ip}:${config.port}`;
    console.log('[MultiSocket] Connecting to room:', config.name, url);

    const socket = io(url, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    const connection: RoomConnection = {
      socket,
      config,
      agents: [],
      agentUpdateQueue: Promise.resolve(),
      lastAgentUpdate: 0,
      transactions: [],
    };

    // Set up one-time connection callback
    if (onConnected) {
      socket.once('connect', () => {
        onConnected();
      });
    }

    this.setupSocketEvents(connection);
    this.connections.set(config.id, connection);
    this.notifyStatus(config.id, false);
    this.notifyUpdate();
  }

  // Helper to process agent updates sequentially to prevent race conditions
  private async queueAgentUpdate(
    connection: RoomConnection,
    updateFn: (agent: AgentInfo, existingAgent: AgentInfo | undefined) => AgentInfo
  ): Promise<void> {
    // Chain to existing queue
    connection.agentUpdateQueue = connection.agentUpdateQueue.then(async () => {
      const now = Date.now();
      const timestamp = now;
      
      // Get current state
      const existingAgent = connection.agents[0];
      
      // Apply update
      const newAgent = updateFn(existingAgent ? { ...existingAgent } : {} as AgentInfo, existingAgent);
      
      // Only update if this is newer than the last update (prevent stale updates)
      if (timestamp >= connection.lastAgentUpdate) {
        connection.agents = [newAgent];
        connection.lastAgentUpdate = timestamp;
        this.notifyUpdate();
      } else {
        console.log('[MultiSocket] Skipping stale agent update:', { timestamp, lastUpdate: connection.lastAgentUpdate });
      }
    });
    
    await connection.agentUpdateQueue;
  }

  // Remove a room connection
  removeRoom(roomId: string): void {
    const connection = this.findConnectionForRoom(roomId);
    if (connection) {
      connection.socket.disconnect();
      this.connections.delete(connection.config.id);
      console.log('[MultiSocket] Room disconnected:', roomId, '(matched to', connection.config.id, ')');
      this.notifyUpdate();
      this.notifyTransactionsUpdate();
    }
  }

  // Get all transactions across all connected rooms (flattened, server-authoritative)
  getTransactions(): Transaction[] {
    return Array.from(this.connections.values()).flatMap(c => c.transactions);
  }

  // Get all room configs
  getRooms(): RoomConfig[] {
    return Array.from(this.connections.values()).map(c => c.config);
  }

  // Check if room is connected
  isConnected(roomId: string): boolean {
    const connection = this.findConnectionForRoom(roomId);
    if (!connection) return false;
    return connection.socket.connected;
  }

  // Robust connection lookup: try multiple IDs.
  // Kadang roomId dari agent (mis. 'room-002') tidak sama dengan config.id cashier ('env-room-1').
  // Fallback: config.id, config.roomId, config.name (case-insensitive), atau agent.roomId.
  private findConnectionForRoom(roomId: string): RoomConnection | undefined {
    if (!roomId) return undefined;

    // 1) Direct match by config.id (the primary key)
    let conn = this.connections.get(roomId);
    if (conn) return conn;

    const targetLower = roomId.toLowerCase().trim();
    const targetNormalized = targetLower.replace(/[^a-z0-9]/g, '');

    for (const c of this.connections.values()) {
      // 2) Match by config.roomId
      if (c.config.roomId && c.config.roomId === roomId) {
        return c;
      }

      // 3) Match by agent's registered roomId (live state)
      const agentRoomId = c.agents[0]?.roomId;
      if (agentRoomId && agentRoomId === roomId) {
        return c;
      }

      // 4) Match by config.name (case-insensitive)
      if (c.config.name && c.config.name.toLowerCase() === targetLower) {
        return c;
      }

      // 5) Match by config.id normalized (strip dashes/spaces/underscores)
      const configIdNormalized = c.config.id.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (configIdNormalized === targetNormalized) {
        return c;
      }
    }

    return undefined;
  }

  // Activate a specific room - finds connection by roomId (from agent)
  async activateRoom(
    roomId: string,
    roomName: string,
    durationMinutes?: number,
    customerName?: string,
    customerPhone?: string,
    customerEmail?: string,
    customerNote?: string,
    onComplete?: () => void,
    originalStartTime?: number,
    packageId?: string,
    originalExpiresAt?: number
  ): Promise<void> {
    console.log('[MultiSocket] activateRoom called with roomId:', roomId, 'duration:', durationMinutes, 'customerName:', customerName);
    console.log('[MultiSocket] Available connections:', Array.from(this.connections.entries()).map(([k, v]) => ({ key: k, configId: v.config.id, configName: v.config.name, agentRoomId: v.agents[0]?.roomId })));

    // Find connection robustly: try config.id, config.roomId, agent.roomId, config.name.
    const connection = this.findConnectionForRoom(roomId);

    if (!connection) {
      console.error('[MultiSocket] Cannot find connection for room:', roomId);
      return;
    }
    
    if (!connection.socket.connected) {
      console.error('[MultiSocket] Cannot activate room - not connected:', roomId);
      return;
    }

    const agentRoomId = connection.agents[0]?.roomId || roomId;
    
    // Set up timeout fallback in case server doesn't respond
    const timeoutMs = 3000;
    const timeoutId = setTimeout(() => {
      console.log('[MultiSocket] Activation timeout, calling callback');
      onComplete?.();
    }, timeoutMs);
    
    // Listen for the activation response from server
    const handleActivation = (data: any) => {
      if (data.roomId === agentRoomId || data.roomId === roomId) {
        clearTimeout(timeoutId);
        connection.socket.off('room:activation', handleActivation);
        console.log('[MultiSocket] Activation confirmed for room:', roomId);
        onComplete?.();
      }
    };
    connection.socket.on('room:activation', handleActivation);
    
    connection.socket.emit('cashier:activate-room', {
      roomId: agentRoomId,
      roomName,
      durationMinutes: durationMinutes ?? undefined,
      packageId: packageId ?? undefined,
      customerName: customerName ?? undefined,
      customerPhone: customerPhone ?? undefined,
      customerEmail: customerEmail ?? undefined,
      customerNote: customerNote ?? undefined,
      originalStartTime: originalStartTime ?? undefined,
      originalExpiresAt: originalExpiresAt ?? undefined,
    });
    console.log('[MultiSocket] Activating room:', roomId, '-> agentRoomId:', agentRoomId, 'duration:', durationMinutes, 'customerName:', customerName);
  }

  // Deactivate a specific room - finds connection by roomId (from agent)
  async deactivateRoom(roomId: string, _paymentMethod?: 'cash' | 'transfer' | 'other', reason?: 'manual' | 'move', onComplete?: () => void): Promise<void> {
    console.log('[MultiSocket] deactivateRoom called with roomId:', roomId);
    console.log('[MultiSocket] Available connections:', Array.from(this.connections.entries()).map(([k, v]) => ({
      key: k,
      configId: v.config.id,
      configName: v.config.name,
      agentRoomId: v.agents[0]?.roomId,
      agentRoomName: v.agents[0]?.roomName
    })));
    
    let connection = this.findConnectionForRoom(roomId);

    if (!connection) {
      console.error('[MultiSocket] Cannot find connection for room:', roomId);
      return;
    }

    if (!connection.socket.connected) {
      console.error('[MultiSocket] Cannot deactivate room - not connected:', roomId);
      return;
    }

    const agentRoomId = connection.agents[0]?.roomId || roomId;
    
    // Set up timeout fallback
    const timeoutMs = 3000;
    const timeoutId = setTimeout(() => {
      console.log('[MultiSocket] Deactivation timeout, calling callback');
      onComplete?.();
    }, timeoutMs);
    
    // Listen for the deactivation response from server
    const handleDeactivation = (data: any) => {
      if (data.roomId === agentRoomId || data.roomId === roomId) {
        clearTimeout(timeoutId);
        connection.socket.off('room:activation', handleDeactivation);
        console.log('[MultiSocket] Deactivation confirmed for room:', roomId);
        onComplete?.();
      }
    };
    connection.socket.on('room:activation', handleDeactivation);
    
    console.log('[MultiSocket] Emitting deactivate-room with roomId:', agentRoomId, 'reason:', reason);
    connection.socket.emit('cashier:deactivate-room', { roomId: agentRoomId, reason });
    console.log('[MultiSocket] Deactivating room:', roomId, '-> agentRoomId:', agentRoomId);
    
    // Transaction will be recorded by room:activation event listener (single source)
  }

  // Load transactions from server for a specific room
  loadTransactions(roomId: string): void {
    const connection = this.findConnectionForRoom(roomId);
    console.log('[MultiSocket] loadTransactions called for:', roomId, 'connection exists:', !!connection, 'connected:', connection?.socket.connected);
    if (connection && connection.socket.connected) {
      console.log('[MultiSocket] Requesting transactions for room:', roomId);
      connection.socket.emit('transaction:get');
    }
  }

  // Mark a room (vacated via Move Room) as cleaned - room-level, no transaction involved
  markRoomCleaned(roomId: string): void {
    const connection = this.findConnectionForRoom(roomId);
    if (!connection || !connection.socket.connected) {
      console.error('[MultiSocket] Cannot mark room cleaned - not connected:', roomId);
      return;
    }
    const agentRoomId = connection.agents[0]?.roomId || roomId;
    connection.socket.emit('cashier:mark-room-cleaned', { roomId: agentRoomId });
  }

  // Update transaction on server (e.g., mark as paid).
  //
  // IMPORTANT: each connected room runs its own independent server + SQLite
  // DB, so this must only be sent to the one connection that owns the
  // transaction's roomId. Broadcasting to every connection (the old
  // behavior) makes every other connected server's DB *also* insert a copy
  // of the same transaction id - it then legitimately exists on two
  // different servers and shows up twice once their slices are flattened.
  updateTransaction(transaction: Transaction): void {
    console.log('[MultiSocket] updateTransaction called with:', transaction.id, 'cleanedAt:', transaction.cleanedAt);

    const connection = this.findConnectionForRoom(transaction.roomId);
    if (!connection || !connection.socket.connected) {
      console.error('[MultiSocket] Cannot update transaction - room not connected:', transaction.roomId);
      return;
    }

    connection.socket.emit('transaction:save', transaction);
  }

  // Delete transaction on server - targets only the transaction's own room
  // connection (see updateTransaction for why broadcasting to all connections
  // is wrong).
  deleteTransaction(transactionId: string, roomId: string, onComplete?: () => void): void {
    const connection = this.findConnectionForRoom(roomId);
    if (!connection || !connection.socket.connected) {
      console.error('[MultiSocket] Cannot delete transaction - room not connected:', roomId);
      onComplete?.();
      return;
    }

    const timeoutMs = 3000;
    const timeoutId = setTimeout(() => {
      onComplete?.();
    }, timeoutMs);

    // Listen for transaction update from server
    const handleTransactionUpdate = () => {
      clearTimeout(timeoutId);
      connection.socket.off('transaction:get', handleTransactionUpdate);
      onComplete?.();
    };

    connection.socket.on('transaction:get', handleTransactionUpdate);
    connection.socket.emit('transaction:delete', transactionId);
  }

  // Clear transactions on server. If roomId is given, only that room's
  // connection is targeted; otherwise transactions are cleared on every
  // connected room (used by the all-rooms transactions page).
  clearTransactions(onComplete?: () => void, roomId?: string): void {
    const timeoutMs = 3000;
    const timeoutId = setTimeout(() => {
      onComplete?.();
    }, timeoutMs);

    const targets = roomId
      ? [this.findConnectionForRoom(roomId)].filter((c): c is RoomConnection => !!c)
      : Array.from(this.connections.values());

    // Listen for transaction update from server
    const handleTransactionUpdate = () => {
      clearTimeout(timeoutId);
      for (const conn of targets) {
        conn.socket.off('transaction:get', handleTransactionUpdate);
      }
      onComplete?.();
    };

    for (const conn of targets) {
      if (conn.socket.connected) {
        conn.socket.on('transaction:get', handleTransactionUpdate);
        conn.socket.emit('transaction:clear', roomId ? { roomId } : undefined);
      }
    }
  }

  // Extend room time
  async extendTime(roomId: string, additionalMinutes: number, onComplete?: () => void): Promise<void> {
    console.log('[MultiSocket] extendTime called with roomId:', roomId, 'additionalMinutes:', additionalMinutes);

    let connection = this.findConnectionForRoom(roomId);

    if (!connection) {
      console.error('[MultiSocket] Cannot find connection for room:', roomId);
      return;
    }

    if (!connection.socket.connected) {
      console.error('[MultiSocket] Cannot extend time - not connected:', roomId);
      return;
    }

    const socket = connection.socket;
    const agentRoomId = connection.agents[0]?.roomId || roomId;
    
    // Set up timeout fallback
    const timeoutMs = 3000;
    const timeoutId = setTimeout(() => {
      console.log('[MultiSocket] Extend time timeout, calling callback');
      onComplete?.();
    }, timeoutMs);
    
    // Listen for the update response from server
    const handleUpdate = () => {
      clearTimeout(timeoutId);
      socket.off('agents:update', handleUpdate);
      console.log('[MultiSocket] Extend time confirmed for room:', roomId);
      onComplete?.();
    };
    socket.on('agents:update', handleUpdate);
    
    console.log('[MultiSocket] Emitting extend-time with roomId:', agentRoomId, 'additionalMinutes:', additionalMinutes);
    connection.socket.emit('cashier:extend-time', { roomId: agentRoomId, additionalMinutes });
    console.log('[MultiSocket] Extended time for room:', roomId, '-> agentRoomId:', agentRoomId, 'minutes:', additionalMinutes);
  }

  // Get all room billings
  getRoomBillings(): Map<string, RoomBilling> {
    const billings = new Map<string, RoomBilling>();

    for (const connection of this.connections.values()) {
      const agent = connection.agents[0]; // One agent per room server
      const roomId = agent?.roomId || connection.config.id;
      const billing = agent
        ? this.agentToBilling(agent, connection.config, connection.socket.connected)
        : {
            roomId: connection.config.id,
            roomName: connection.config.name,
            startTime: null,
            currentDuration: 0,
            totalPrice: 0,
            status: 'idle' as const,
            pricePerHour: 50000, // Belum ada agent terdaftar, belum tahu tarif server
            isActive: false,
            expiresAt: null,
            isConnected: connection.socket.connected,
            needsCleaning: false,
            lastTransactionEndTime: undefined,
          };

      billings.set(roomId, billing);
    }

    return billings;
  }

  private setupSocketEvents(connection: RoomConnection): void {
    const { socket, config } = connection;

    socket.on('connect', () => {
      console.log('[MultiSocket] Connected to room:', config.name);
      this.notifyStatus(config.id, true);
      this.notifyUpdate();
      // Request agent list
      socket.emit('cashier:request-agents');
      // Request transactions from server
      socket.emit('transaction:get');
    });

    // Listen for transactions from server - this is always the complete,
    // authoritative list for this connection, so replace (never merge).
    socket.on('transaction:get', (transactions: Transaction[]) => {
      console.log('[MultiSocket] Received transactions from server:', transactions.length, 'Room:', config.name);
      connection.transactions = transactions;
      this.notifyTransactionsUpdate();
    });

    socket.on('disconnect', (reason) => {
      console.log('[MultiSocket] Disconnected from room:', config.name, reason);
      this.notifyStatus(config.id, false);
      this.notifyUpdate();
    });

    socket.on('connect_error', (error) => {
      console.error('[MultiSocket] Connection error for room:', config.name, error.message);
    });

    // Listen for agent registration
    socket.on('agent:register', (newAgent: AgentInfo) => {
      console.log('[MultiSocket] Agent registered:', config.name, newAgent);
      this.queueAgentUpdate(connection, (agent, existingAgent) => {
        // Merge new agent data with preservation of billing-related data
        const merged = { ...agent, ...newAgent };
        const existing = existingAgent as any;
        
        if (existing) {
          // Only preserve data if room is still active (not reactivation scenario)
          if (existing.isActive && merged.isActive) {
            // Room was and still is active - preserve billing data
            if (existing.startTime && !merged.startTime) merged.startTime = existing.startTime;
            if (existing.expiresAt && !merged.expiresAt) merged.expiresAt = existing.expiresAt;
            if (existing.isActive && !merged.isActive) merged.isActive = existing.isActive;
            // Preserve customer info only if room is still active
            if (existing.customerName && !merged.customerName) merged.customerName = existing.customerName;
            if (existing.customerPhone && !merged.customerPhone) merged.customerPhone = existing.customerPhone;
            if (existing.customerEmail && !merged.customerEmail) merged.customerEmail = existing.customerEmail;
            if (existing.customerNote && !merged.customerNote) merged.customerNote = existing.customerNote;
          }
          // If room was inactive and now active (reactivation), don't preserve old data
        }
        return merged;
      });
    });

    // Listen for agent status updates
    socket.on('agent:status', (data: { agent: AgentInfo }) => {
      this.queueAgentUpdate(connection, (agent, existingAgent) => {
        const merged = { ...agent, ...data.agent };
        const existing = existingAgent as any;
        
        // Preserve billing data - use later expiry, but ONLY while the room
        // stays active (extending time). On reactivation (was inactive, now
        // active) trust the server's new expiresAt verbatim, including null
        // (meaning "no duration set") - don't resurrect the stale old expiry.
        if (existing) {
          const wasActive = existing.isActive === true;
          const isNowActive = merged.isActive === true;
          if (wasActive && isNowActive) {
            if (existing.expiresAt && (!merged.expiresAt || existing.expiresAt > merged.expiresAt)) {
              merged.expiresAt = existing.expiresAt;
            }
          }
          // Use the LATEST startTime when reactivating (new activation = new startTime)
          // Only preserve old startTime if the room is still active (extending time scenario)
          if (wasActive && isNowActive) {
            // Room was active before and still active - use earlier startTime (extending time)
            if (existing.startTime && (!merged.startTime || existing.startTime < merged.startTime)) {
              merged.startTime = existing.startTime;
            }
          } else if (!wasActive && isNowActive) {
            // Room was inactive and now active - use NEW startTime from server (reactivation)
            // Don't preserve old startTime - let server's startTime be used
          }
          if (existing.isActive) merged.isActive = existing.isActive;
          // Preserve customer info ONLY if room is still active (reactivation should clear old customer info)
          if (existing.isActive) {
            // Room was active before - preserve customer info for extending time scenario
            if (existing.customerName) merged.customerName = existing.customerName;
            if (existing.customerPhone) merged.customerPhone = existing.customerPhone;
            if (existing.customerEmail) merged.customerEmail = existing.customerEmail;
            if (existing.customerNote) merged.customerNote = existing.customerNote;
          }
          // If room was inactive and now active (reactivation), don't preserve old customer info
        }
        return merged;
      });
    });

    // Listen for heartbeat updates
    socket.on('agent:heartbeat', (data: { agent: AgentInfo }) => {
      this.queueAgentUpdate(connection, (agent, existingAgent) => {
        const merged = { ...agent, ...data.agent };
        const existing = existingAgent as any;

        // Preserve billing data - use later expiry, but ONLY while the room
        // stays active (extending time). On reactivation (was inactive, now
        // active) trust the server's new expiresAt verbatim, including null
        // (meaning "no duration set") - don't resurrect the stale old expiry.
        if (existing) {
          const wasActive = existing.isActive === true;
          const isNowActive = merged.isActive === true;
          if (wasActive && isNowActive) {
            if (existing.expiresAt && (!merged.expiresAt || existing.expiresAt > merged.expiresAt)) {
              merged.expiresAt = existing.expiresAt;
            }
          }
          // Use the LATEST startTime when reactivating (new activation = new startTime)
          // Only preserve old startTime if the room is still active (extending time scenario)
          if (wasActive && isNowActive) {
            // Room was active before and still active - use earlier startTime (extending time)
            if (existing.startTime && (!merged.startTime || existing.startTime < merged.startTime)) {
              merged.startTime = existing.startTime;
            }
          } else if (!wasActive && isNowActive) {
            // Room was inactive and now active - use NEW startTime from server (reactivation)
            // Don't preserve old startTime - let server's startTime be used
          }
          if (existing.isActive) merged.isActive = existing.isActive;
          // Preserve customer info ONLY if room is still active (reactivation should clear old customer info)
          if (existing.isActive) {
            // Room was active before - preserve customer info for extending time scenario
            if (existing.customerName) merged.customerName = existing.customerName;
            if (existing.customerPhone) merged.customerPhone = existing.customerPhone;
            if (existing.customerEmail) merged.customerEmail = existing.customerEmail;
            if (existing.customerNote) merged.customerNote = existing.customerNote;
          }
          // If room was inactive and now active (reactivation), don't preserve old customer info
        }
        return merged;
      });
    });

    // Listen for player state updates
    socket.on('player:state', (data: { roomId: string; player: PlayerState }) => {
      this.queueAgentUpdate(connection, (agent, existingAgent) => {
        if (existingAgent) {
          existingAgent.player = data.player;
          return existingAgent;
        }
        return { ...agent, player: data.player } as AgentInfo;
      });
    });

    // Listen for bulk agent list
    socket.on('agents:update', (agents: AgentInfo[]) => {
      console.log('[MultiSocket] Agents update for room:', config.name, agents);
      
      // Use queue to process updates sequentially
      const now = Date.now();
      const timestamp = now;
      
      connection.agentUpdateQueue = connection.agentUpdateQueue.then(async () => {
        // Skip if there's a newer update waiting
        if (timestamp < connection.lastAgentUpdate) {
          console.log('[MultiSocket] Skipping stale agents:update');
          return;
        }
        
        // Merge with existing billing data
        for (let i = 0; i < agents.length; i++) {
          const incomingAgent = agents[i];
          const existingAgent = connection.agents[i] as any;
          if (incomingAgent && existingAgent) {
            const existingExpiresAt = existingAgent.expiresAt;
            const incomingExpiresAt = incomingAgent.expiresAt;
            // Use later expiresAt (more time remaining), but ONLY while the
            // room stays active (extending time). On reactivation (was
            // inactive, now active) trust the server's new value verbatim,
            // including null (meaning "no duration set") - don't resurrect
            // the stale old expiry.
            if (incomingAgent.isActive && existingAgent.isActive) {
              if (existingExpiresAt && (!incomingExpiresAt || existingExpiresAt > incomingExpiresAt)) {
                incomingAgent.expiresAt = existingExpiresAt;
              }
            }
            // Use the LATEST startTime when reactivating (new activation = new startTime)
            // Only preserve old startTime if the room is still active (extending time scenario)
            if (incomingAgent.isActive && existingAgent.isActive) {
              // Room was active before and still active - use earlier startTime (extending time)
              const existingStartTime = existingAgent.startTime;
              const incomingStartTime = incomingAgent.startTime;
              if (existingStartTime && (!incomingStartTime || existingStartTime < incomingStartTime)) {
                incomingAgent.startTime = existingStartTime;
              }
            } else if (incomingAgent.isActive && !existingAgent.isActive) {
              // Room was inactive and now active - use NEW startTime from server (reactivation)
              // Don't preserve old startTime - let server's startTime be used
            }
            if (existingAgent.isActive) incomingAgent.isActive = existingAgent.isActive;
            // Preserve customer info ONLY if room is still active (reactivation should clear old customer info)
            if (incomingAgent.isActive && existingAgent.isActive) {
              // Room was active before and still active - preserve customer info
              if (existingAgent.customerName) (incomingAgent as any).customerName = existingAgent.customerName;
              if (existingAgent.customerPhone) (incomingAgent as any).customerPhone = existingAgent.customerPhone;
              if (existingAgent.customerEmail) (incomingAgent as any).customerEmail = existingAgent.customerEmail;
              if (existingAgent.customerNote) (incomingAgent as any).customerNote = existingAgent.customerNote;
            } else if (!incomingAgent.isActive && existingAgent.isActive) {
              // Room was active and now inactive - this is deactivation, clear customer info
            }
            // If room was inactive and now active (reactivation), don't preserve old customer info
          }
        }

        connection.agents = agents;
        connection.lastAgentUpdate = timestamp;
        this.notifyUpdate();
      });
    });

    socket.on('agents:list', (agents: AgentInfo[]) => {
      console.log('[MultiSocket] Agents list for room:', config.name, agents);
      
      // Use queue to process updates sequentially
      const now = Date.now();
      const timestamp = now;
      
      connection.agentUpdateQueue = connection.agentUpdateQueue.then(async () => {
        // Skip if there's a newer update waiting
        if (timestamp < connection.lastAgentUpdate) {
          console.log('[MultiSocket] Skipping stale agents:list');
          return;
        }
        
        // Merge with existing billing data
        for (let i = 0; i < agents.length; i++) {
          const incomingAgent = agents[i];
          const existingAgent = connection.agents[i] as any;
          if (incomingAgent && existingAgent) {
            const existingExpiresAt = existingAgent.expiresAt;
            const incomingExpiresAt = incomingAgent.expiresAt;
            // Use later expiresAt (more time remaining), but ONLY while the
            // room stays active (extending time). On reactivation (was
            // inactive, now active) trust the server's new value verbatim,
            // including null (meaning "no duration set") - don't resurrect
            // the stale old expiry.
            if (incomingAgent.isActive && existingAgent.isActive) {
              if (existingExpiresAt && (!incomingExpiresAt || existingExpiresAt > incomingExpiresAt)) {
                incomingAgent.expiresAt = existingExpiresAt;
              }
            }
            // Use the LATEST startTime when reactivating (new activation = new startTime)
            // Only preserve old startTime if the room is still active (extending time scenario)
            if (incomingAgent.isActive && existingAgent.isActive) {
              // Room was active before and still active - use earlier startTime (extending time)
              const existingStartTime = existingAgent.startTime;
              const incomingStartTime = incomingAgent.startTime;
              if (existingStartTime && (!incomingStartTime || existingStartTime < incomingStartTime)) {
                incomingAgent.startTime = existingStartTime;
              }
            } else if (incomingAgent.isActive && !existingAgent.isActive) {
              // Room was inactive and now active - use NEW startTime from server (reactivation)
              // Don't preserve old startTime - let server's startTime be used
            }
            if (existingAgent.isActive) incomingAgent.isActive = existingAgent.isActive;
            // Preserve customer info ONLY if room is still active (reactivation should clear old customer info)
            if (incomingAgent.isActive && existingAgent.isActive) {
              // Room was active before and still active - preserve customer info
              if (existingAgent.customerName) (incomingAgent as any).customerName = existingAgent.customerName;
              if (existingAgent.customerPhone) (incomingAgent as any).customerPhone = existingAgent.customerPhone;
              if (existingAgent.customerEmail) (incomingAgent as any).customerEmail = existingAgent.customerEmail;
              if (existingAgent.customerNote) (incomingAgent as any).customerNote = existingAgent.customerNote;
            }
            // If room was inactive and now active (reactivation), don't preserve old customer info
          }
        }
        
        connection.agents = agents;
        connection.lastAgentUpdate = timestamp;
        this.notifyUpdate();
      });
    });

    // Listen for room activation updates (includes expiry info)
    socket.on('room:activation', (data: { roomId: string; roomName?: string; isActive: boolean; expiresAt?: number | null; reason?: string; startTime?: number; customerName?: string; customerPhone?: string; customerEmail?: string; customerNote?: string; needsCleaning?: boolean; lastTransactionEndTime?: number | null; activePackageId?: string | null; packagePrice?: number | null; packageDurationMinutes?: number | null }) => {
      console.log('[MultiSocket] Room activation update:', config.name, {
        ...data,
        expiresAtFormatted: data.expiresAt ? new Date(data.expiresAt).toISOString() : null,
        nowFormatted: new Date().toISOString(),
        timeDiff: data.expiresAt ? data.expiresAt - Date.now() : null
      });
      
      // Transaction recording (duration/totalPrice calculation) now happens
      // server-side when the room actually deactivates, using the server's
      // own authoritative agent.startTime/pricePerHour - not client-supplied
      // numbers. The cashier just reflects whatever the server broadcasts.

      // Use queue for state update
      this.queueAgentUpdate(connection, (agent, existing) => {
        const merged = { ...agent, isActive: data.isActive };
        const existingData = existing as any;
        
        // expiresAt handling mirrors startTime below: only merge with the
        // "later wins" heuristic while the room stays active (extending time).
        // On reactivation (was inactive, now active) always trust the server's
        // new value verbatim - including null, which means "no duration set".
        const currentExpiresAt = merged.expiresAt;
        const newExpiresAt = data.expiresAt ?? null;
        const wasActiveBeforeThisUpdate = existingData?.isActive;
        if (data.isActive && !wasActiveBeforeThisUpdate) {
          // Reactivation - server's value is authoritative, even if null
          merged.expiresAt = newExpiresAt;
        } else if (!currentExpiresAt || (newExpiresAt && newExpiresAt > currentExpiresAt)) {
          merged.expiresAt = newExpiresAt;
        }
        
        // Use the LATEST startTime when reactivating (new activation = new startTime)
        // Only preserve old startTime if the room is still active (extending time scenario)
        if (data.isActive) {
          const existingIsActive = existingData?.isActive;
          if (existingIsActive) {
            // Room was active before and still active - use earlier startTime (extending time)
            if (data.startTime && data.isActive) {
              if (!merged.startTime || data.startTime < merged.startTime) {
                merged.startTime = data.startTime;
              }
            }
          } else {
            // Room was inactive and now active - use NEW startTime from server (reactivation)
            if (data.startTime) {
              merged.startTime = data.startTime;
            }
          }
        }
        
        // Preserve existing customer info ONLY if room is still active (reactivation should clear old customer info)
        if (existingData && existingData.isActive) {
          // Room was active before - preserve customer info for extending time scenario
          if (!data.customerName && existingData.customerName) merged.customerName = existingData.customerName;
          if (!data.customerPhone && existingData.customerPhone) merged.customerPhone = existingData.customerPhone;
          if (!data.customerEmail && existingData.customerEmail) merged.customerEmail = existingData.customerEmail;
          if (!data.customerNote && existingData.customerNote) merged.customerNote = existingData.customerNote;
        }
        // If room was inactive and now active (reactivation), don't preserve old customer info
        
        // Override with new customer info if provided
        if (data.customerName) (merged as any).customerName = data.customerName;
        if (data.customerPhone) (merged as any).customerPhone = data.customerPhone;
        if (data.customerEmail) (merged as any).customerEmail = data.customerEmail;
        if (data.customerNote) (merged as any).customerNote = data.customerNote;

        // Room-level cleaning flag (set by the server on a Move Room deactivate,
        // cleared on the next activation) - independent of the transaction/payment flow.
        if (data.isActive) {
          (merged as any).needsCleaning = false;
          (merged as any).lastTransactionEndTime = null;
        } else if (data.needsCleaning !== undefined) {
          (merged as any).needsCleaning = data.needsCleaning;
          (merged as any).lastTransactionEndTime = data.lastTransactionEndTime ?? null;
        }

        // Package info - only sent by the server on activation. On deactivation
        // the session is over, so clear it (a package never carries across
        // reactivations/moves - server resets it too, see recordTransaction).
        if (data.isActive) {
          (merged as any).activePackageId = data.activePackageId ?? null;
          (merged as any).packagePrice = data.packagePrice ?? null;
          (merged as any).packageDurationMinutes = data.packageDurationMinutes ?? null;
        } else {
          (merged as any).activePackageId = null;
          (merged as any).packagePrice = null;
          (merged as any).packageDurationMinutes = null;
        }

        return merged;
      });
    });

    // Listen for expiry warnings
    socket.on('room:expiry-warning', (data: { roomId: string; secondsRemaining: number; expiresAt: number }) => {
      console.log('[MultiSocket] Expiry warning:', config.name, data);
      this.queueAgentUpdate(connection, (agent, existingAgent) => {
        if (existingAgent) {
          existingAgent.expiresAt = data.expiresAt;
          return existingAgent;
        }
        return { ...agent, expiresAt: data.expiresAt } as AgentInfo;
      });
      // Emit warning event for UI
      this.expiryWarningCallbacks.forEach(cb => cb(data));
    });
  }

  private agentToBilling(agent: AgentInfo, config: RoomConfig, isConnected: boolean): RoomBilling {
    const roomId = agent.roomId || config.id;
    const roomName = agent.roomName || config.name;

    let status: 'idle' | 'playing' | 'paused' = 'idle';
    let startTime: number | null = agent.startTime ?? null;
    let currentDuration = 0;

    // Determine status from agent
    if (agent.status === 'PLAYING' || agent.player?.state === 'playing') {
      status = 'playing';
      // Only set startTime to now if not already set (for timer-based billing)
      if (!startTime) {
        startTime = Date.now();
      }
    } else if (agent.status === 'PAUSED' || agent.player?.state === 'paused') {
      status = 'paused';
    }

    // Calculate current duration based on timer (expiresAt) if available
    // Otherwise use player's currentTime
    if (agent.expiresAt && startTime) {
      // Timer-based: duration = expiresAt - startTime (total time purchased)
      currentDuration = Math.floor((agent.expiresAt - startTime) / 1000);
    } else if (agent.player?.currentTime) {
      // Non-timer: use player's current time
      currentDuration = agent.player.currentTime;
    }

    // Calculate price per block/jam (minimum 1 jam, dibulatkan ke atas).
    // If a package is active, this is just a live estimate for display - the
    // server recomputes the real, authoritative totalPrice the same way when
    // the session actually ends (recordTransaction on the server).
    const pricePerHour = agent.pricePerHour ?? 50000;
    const packagePrice = agent.packagePrice ?? null;
    const packageDurationMinutes = agent.packageDurationMinutes ?? null;
    let totalPrice: number;
    if (packagePrice != null && packageDurationMinutes != null) {
      const overageSeconds = Math.max(0, currentDuration - packageDurationMinutes * 60);
      totalPrice = packagePrice + Math.ceil(overageSeconds / 3600) * pricePerHour;
    } else {
      totalPrice = Math.ceil(currentDuration / 3600) * pricePerHour;
    }

    const agentAny = agent as any;
    return {
      roomId,
      roomName,
      startTime,
      currentDuration,
      totalPrice,
      status,
      pricePerHour,
      isActive: agent.isActive ?? false,
      expiresAt: agent.expiresAt ?? null,
      isConnected,
      needsCleaning: agentAny.needsCleaning ?? false,
      lastTransactionEndTime: agentAny.lastTransactionEndTime,
      customerName: agentAny.customerName,
      customerPhone: agentAny.customerPhone,
      customerEmail: agentAny.customerEmail,
      customerNote: agentAny.customerNote,
      activePackageId: agentAny.activePackageId ?? null,
      packagePrice,
      packageDurationMinutes,
      packages: agent.packages,
    };
  }

  private notifyUpdate(): void {
    const billings = this.getRoomBillings();
    this.updateCallbacks.forEach(cb => cb(billings));
  }

  private notifyStatus(roomId: string, connected: boolean): void {
    this.statusCallbacks.forEach(cb => cb(roomId, connected));
  }

  private notifyTransactionsUpdate(): void {
    const transactions = this.getTransactions();
    this.transactionsUpdateCallbacks.forEach(cb => cb(transactions));
  }

  // Subscribe to transaction updates (flattened across all connected rooms)
  onTransactionsUpdate(callback: TransactionsUpdateCallback): () => void {
    this.transactionsUpdateCallbacks.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.transactionsUpdateCallbacks.indexOf(callback);
      if (index > -1) {
        this.transactionsUpdateCallbacks.splice(index, 1);
      }
    };
  }

  // Subscribe to room updates
  onUpdate(callback: RoomUpdateCallback): () => void {
    this.updateCallbacks.push(callback);
    // Don't send initial data here - it will be empty if agent just connected
    // Let notifyUpdate() handle sending data after agent registration
    
    // Return unsubscribe function
    return () => {
      const index = this.updateCallbacks.indexOf(callback);
      if (index > -1) {
        this.updateCallbacks.splice(index, 1);
      }
    };
  }

  // Subscribe to connection status changes
  onStatusChange(callback: ConnectionStatusCallback): () => void {
    this.statusCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.statusCallbacks.indexOf(callback);
      if (index > -1) {
        this.statusCallbacks.splice(index, 1);
      }
    };
  }

  // Subscribe to expiry warnings
  onExpiryWarning(callback: ExpiryWarningCallback): void {
    this.expiryWarningCallbacks.push(callback);
  }

  // Disconnect all
  disconnectAll(): void {
    for (const [id] of this.connections) {
      this.removeRoom(id);
    }
  }
}

// Singleton instance
export const multiSocketService = new MultiSocketService();

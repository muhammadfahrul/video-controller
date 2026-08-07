import { io, Socket } from 'socket.io-client';
import type { AgentInfo, PlayerState, RoomConfig, RoomBilling, Transaction } from '../types';
import { useTransactionStore } from '../store/useTransactionStore';
import { securityConfig } from '../config/security';

// Helper to format duration in seconds to human readable
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}j ${minutes}m`;
  return `${minutes}m`;
}

type RoomUpdateCallback = (rooms: Map<string, RoomBilling>) => void;
type ConnectionStatusCallback = (roomId: string, connected: boolean) => void;
type ExpiryWarningCallback = (data: { roomId: string; secondsRemaining: number; expiresAt: number }) => void;

interface RoomConnection {
  socket: Socket;
  config: RoomConfig;
  agents: AgentInfo[];
  // Queue to process agent updates sequentially to prevent race conditions
  agentUpdateQueue: Promise<void>;
  // Track last update timestamp to handle out-of-order events
  lastAgentUpdate: number;
}

class MultiSocketService {
  private connections: Map<string, RoomConnection> = new Map();
  private updateCallbacks: RoomUpdateCallback[] = [];
  private statusCallbacks: ConnectionStatusCallback[] = [];
  private expiryWarningCallbacks: ExpiryWarningCallback[] = [];
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
      auth: {
        token: securityConfig.sharedSecret,
      },
    });

    socket.on('connect_error', (err) => {
      console.error('[MultiSocket] Connection to', config.name, 'rejected:', err.message);
    });

    const connection: RoomConnection = {
      socket,
      config,
      agents: [],
      agentUpdateQueue: Promise.resolve(),
      lastAgentUpdate: 0,
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
    const connection = this.connections.get(roomId);
    if (connection) {
      connection.socket.disconnect();
      this.connections.delete(roomId);
      console.log('[MultiSocket] Room disconnected:', roomId);
      this.notifyUpdate();
    }
  }

  // Get all room configs
  getRooms(): RoomConfig[] {
    return Array.from(this.connections.values()).map(c => c.config);
  }

  // Check if room is connected
  isConnected(roomId: string): boolean {
    return this.connections.get(roomId)?.socket.connected ?? false;
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
    onComplete?: () => void
  ): Promise<void> {
    console.log('[MultiSocket] activateRoom called with roomId:', roomId, 'duration:', durationMinutes, 'customerName:', customerName);
    console.log('[MultiSocket] Available connections:', Array.from(this.connections.entries()).map(([k, v]) => ({ key: k, configId: v.config.id, configName: v.config.name, agentRoomId: v.agents[0]?.roomId })));

    let connection: RoomConnection | undefined;
    
    // Find connection by matching roomId (from agent) or config.id
    for (const conn of this.connections.values()) {
      console.log('[MultiSocket] Checking connection:', { configId: conn.config.id, agentRoomId: conn.agents[0]?.roomId, lookingFor: roomId });
      if (conn.agents[0]?.roomId === roomId || conn.config.id === roomId) {
        connection = conn;
        break;
      }
    }
    
    if (!connection) {
      console.error('[MultiSocket] Cannot find connection for room:', roomId);
      onComplete?.();
      return;
    }

    if (!connection.socket.connected) {
      console.error('[MultiSocket] Cannot activate room - not connected:', roomId);
      onComplete?.();
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
      customerName: customerName ?? undefined,
      customerPhone: customerPhone ?? undefined,
      customerEmail: customerEmail ?? undefined,
      customerNote: customerNote ?? undefined,
    });
    console.log('[MultiSocket] Activating room:', roomId, '-> agentRoomId:', agentRoomId, 'duration:', durationMinutes, 'customerName:', customerName);
  }

  // Deactivate a specific room - finds connection by roomId (from agent)
  async deactivateRoom(roomId: string, _paymentMethod?: 'cash' | 'transfer' | 'other', _notes?: string, onComplete?: () => void): Promise<void> {
    console.log('[MultiSocket] deactivateRoom called with roomId:', roomId);
    console.log('[MultiSocket] Available connections:', Array.from(this.connections.entries()).map(([k, v]) => ({
      key: k,
      configId: v.config.id,
      configName: v.config.name,
      agentRoomId: v.agents[0]?.roomId,
      agentRoomName: v.agents[0]?.roomName
    })));
    
    let connection: RoomConnection | undefined;
    
    // Find connection by matching roomId (from agent) or config.id
    for (const conn of this.connections.values()) {
      console.log('[MultiSocket] Checking connection - configId:', conn.config.id, 'agentRoomId:', conn.agents[0]?.roomId, 'lookingFor:', roomId);
      if (conn.agents[0]?.roomId === roomId || conn.config.id === roomId) {
        connection = conn;
        break;
      }
    }
    
    if (!connection) {
      console.error('[MultiSocket] Cannot find connection for room:', roomId);
      onComplete?.();
      return;
    }

    if (!connection.socket.connected) {
      console.error('[MultiSocket] Cannot deactivate room - not connected:', roomId);
      onComplete?.();
      return;
    }

    const agentRoomId = connection.agents[0]?.roomId || roomId;
    
    // Transaction will be recorded by room:activation event listener (single source)
    
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
    
    console.log('[MultiSocket] Emitting deactivate-room with roomId:', agentRoomId);
    connection.socket.emit('cashier:deactivate-room', { roomId: agentRoomId });
    console.log('[MultiSocket] Deactivating room:', roomId, '-> agentRoomId:', agentRoomId);
    
    // Transaction will be recorded by room:activation event listener (single source)
  }

  // Save transaction to server
  private saveTransactionToServer(socket: Socket, transaction: Transaction): void {
    socket.emit('transaction:save', transaction);
  }

  // Load transactions from server for a specific room
  loadTransactions(roomId: string): void {
    let connection: RoomConnection | undefined;
    for (const conn of this.connections.values()) {
      if (conn.agents[0]?.roomId === roomId || conn.config.id === roomId) {
        connection = conn;
        break;
      }
    }

    if (connection && connection.socket.connected) {
      console.log('[MultiSocket] Requesting transactions for room:', roomId);
      connection.socket.emit('transaction:get');
    }
  }

  // Find the connection that owns a given roomId (matches agent.roomId or config.id)
  private findConnectionForRoom(roomId: string | undefined): RoomConnection | undefined {
    if (!roomId) return undefined;
    for (const conn of this.connections.values()) {
      if (conn.agents[0]?.roomId === roomId || conn.config.id === roomId) {
        return conn;
      }
    }
    return undefined;
  }

  // Update transaction on server (e.g., mark as paid) - only the owning room's server, each room has its own DB
  updateTransaction(transaction: any): void {
    const connection = this.findConnectionForRoom(transaction?.roomId);
    if (connection?.socket.connected) {
      connection.socket.emit('transaction:save', transaction);
    } else {
      console.error('[MultiSocket] Cannot update transaction - room not connected:', transaction?.roomId);
    }
  }

  // Delete transaction on server - only from the owning room's server
  deleteTransaction(transactionId: string, onComplete?: () => void): void {
    const transaction = useTransactionStore.getState().transactions.find(t => t.id === transactionId);
    const connection = this.findConnectionForRoom(transaction?.roomId);

    if (!connection?.socket.connected) {
      console.error('[MultiSocket] Cannot delete transaction - room not connected:', transaction?.roomId);
      onComplete?.();
      return;
    }

    const timeoutMs = 3000;
    const timeoutId = setTimeout(() => {
      onComplete?.();
    }, timeoutMs);

    const handleTransactionUpdate = () => {
      clearTimeout(timeoutId);
      connection.socket.off('transaction:get', handleTransactionUpdate);
      onComplete?.();
    };

    connection.socket.on('transaction:get', handleTransactionUpdate);
    connection.socket.emit('transaction:delete', transactionId);
  }

  // Clear transactions on server. Pass roomId to clear only that room's history;
  // omit it to clear every connected room's server (legacy "clear everything" behavior).
  clearTransactions(roomId?: string, onComplete?: () => void): void {
    const timeoutMs = 3000;
    const timeoutId = setTimeout(() => {
      onComplete?.();
    }, timeoutMs);

    if (roomId) {
      const connection = this.findConnectionForRoom(roomId);
      if (!connection?.socket.connected) {
        clearTimeout(timeoutId);
        console.error('[MultiSocket] Cannot clear transactions - room not connected:', roomId);
        onComplete?.();
        return;
      }
      const handleTransactionUpdate = () => {
        clearTimeout(timeoutId);
        connection.socket.off('transaction:get', handleTransactionUpdate);
        onComplete?.();
      };
      connection.socket.on('transaction:get', handleTransactionUpdate);
      connection.socket.emit('transaction:clear');
      return;
    }

    // No roomId given: clear on every connected room server
    const handleTransactionUpdate = () => {
      clearTimeout(timeoutId);
      for (const conn of this.connections.values()) {
        conn.socket.off('transaction:get', handleTransactionUpdate);
      }
      onComplete?.();
    };

    for (const conn of this.connections.values()) {
      if (conn.socket.connected) {
        conn.socket.on('transaction:get', handleTransactionUpdate);
        conn.socket.emit('transaction:clear');
      }
    }
  }

  // Extend room time
  async extendTime(roomId: string, additionalMinutes: number, onComplete?: () => void): Promise<void> {
    console.log('[MultiSocket] extendTime called with roomId:', roomId, 'additionalMinutes:', additionalMinutes);
    
    let connection: RoomConnection | undefined;
    
    for (const conn of this.connections.values()) {
      if (conn.agents[0]?.roomId === roomId || conn.config.id === roomId) {
        connection = conn;
        break;
      }
    }
    
    if (!connection) {
      console.error('[MultiSocket] Cannot find connection for room:', roomId);
      onComplete?.();
      return;
    }

    if (!connection.socket.connected) {
      console.error('[MultiSocket] Cannot extend time - not connected:', roomId);
      onComplete?.();
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
            pricePerHour: 50000,
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
      // Request agent list
      socket.emit('cashier:request-agents');
      // Request transactions from server
      socket.emit('transaction:get');
    });

// Listen for transactions from server. Each room has its own server/DB, so this
// payload is only ever that one room's transactions - merge it into just that
// room's slice of the store instead of replacing the whole store (which would
// wipe out every other room's already-loaded transactions).
    socket.on('transaction:get', (transactions: any[]) => {
      console.log('[MultiSocket] Received transactions from server:', transactions.length);
      // effectiveRoomId sekarang deterministik — ga lagi gantung ke transactions[0]?.roomId
      // (yang bisa undefined pas array kosong, bikin key filter/replace di setTransactionsForRoom
      // meleset dari key yang dipake pas nulis data pertama kali -> data numpuk ga pernah ke-replace)
      const effectiveRoomId = connection.agents[0]?.roomId || config.id;
      useTransactionStore.getState().setTransactionsForRoom(effectiveRoomId, transactions);
    });

    socket.on('disconnect', (reason) => {
      console.log('[MultiSocket] Disconnected from room:', config.name, reason);
      this.notifyStatus(config.id, false);
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
        
        // Preserve billing data - use later expiry
        if (existing) {
          if (existing.expiresAt && (!merged.expiresAt || existing.expiresAt > merged.expiresAt)) {
            merged.expiresAt = existing.expiresAt;
          }
          // Use the LATEST startTime when reactivating (new activation = new startTime)
          // Only preserve old startTime if the room is still active (extending time scenario)
          const wasActive = existing.isActive === true;
          const isNowActive = merged.isActive === true;
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
        
        // Preserve billing data - use later expiry
        if (existing) {
          if (existing.expiresAt && (!merged.expiresAt || existing.expiresAt > merged.expiresAt)) {
            merged.expiresAt = existing.expiresAt;
          }
          // Use the LATEST startTime when reactivating (new activation = new startTime)
          // Only preserve old startTime if the room is still active (extending time scenario)
          const wasActive = existing.isActive === true;
          const isNowActive = merged.isActive === true;
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
            // Use later expiresAt (more time remaining)
            if (existingExpiresAt && (!incomingExpiresAt || existingExpiresAt > incomingExpiresAt)) {
              incomingAgent.expiresAt = existingExpiresAt;
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
            // Use later expiresAt (more time remaining)
            if (existingExpiresAt && (!incomingExpiresAt || existingExpiresAt > incomingExpiresAt)) {
              incomingAgent.expiresAt = existingExpiresAt;
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
    socket.on('room:activation', (data: { roomId: string; roomName?: string; isActive: boolean; expiresAt?: number | null; reason?: string; startTime?: number; customerName?: string; customerPhone?: string; customerEmail?: string; customerNote?: string }) => {
      console.log('[MultiSocket] Room activation update:', config.name, {
        ...data,
        expiresAtFormatted: data.expiresAt ? new Date(data.expiresAt).toISOString() : null,
        nowFormatted: new Date().toISOString(),
        timeDiff: data.expiresAt ? data.expiresAt - Date.now() : null
      });

      const existingAgent = connection.agents[0];
      const wasActive = existingAgent?.isActive === true;
      const isNowInactive = data.isActive === false;

      if (existingAgent && wasActive && isNowInactive) {
        const agent = existingAgent as any;
        const pricePerHour = config.pricePerHour || 50000;
        const startTime = agent.startTime || 0;
        const endTime = data.expiresAt || agent.expiresAt || Date.now();
        const durationSeconds = Math.floor((endTime - startTime) / 1000);

        console.log('[MultiSocket] Transaction calculation:', {
          startTime,
          startTimeFormatted: startTime ? new Date(startTime).toISOString() : 'null',
          dataExpiresAt: data.expiresAt,
          dataExpiresAtFormatted: data.expiresAt ? new Date(data.expiresAt).toISOString() : 'null/undefined',
          agentExpiresAt: agent.expiresAt,
          endTime,
          endTimeFormatted: new Date(endTime).toISOString(),
          durationSeconds,
          durationFormatted: formatDuration(durationSeconds),
        });
        const totalPrice = Math.max(0, Math.ceil(durationSeconds / 3600) * pricePerHour);

        console.log('[MultiSocket] Auto-deactivate: Recording transaction:', {
          roomId: data.roomId,
          roomName: data.roomName || config.name,
          startTime,
          startTimeFormatted: new Date(startTime).toISOString(),
          endTime,
          endTimeFormatted: new Date(endTime).toISOString(),
          duration: durationSeconds,
          durationFormatted: formatDuration(durationSeconds),
          totalPrice,
          customerName: agent.customerName,
          agentStartTime: agent.startTime,
          agentExpiresAt: agent.expiresAt,
        });

        if (startTime > 0 && durationSeconds > 0) {
          // Id di-generate SEKALI di sini, dipake bareng buat local optimistic add & server save.
          // Match persis by id -> pas transaction:get balikin data dari server, setTransactionsForRoom
          // replace row yang SAMA (bukan nambah row baru dengan id beda kayak sebelumnya).
          const transactionId = crypto.randomUUID();
          const transactionPayload = {
            id: transactionId,
            roomId: data.roomId,
            roomName: data.roomName || config.name,
            customerName: agent.customerName,
            customerPhone: agent.customerPhone,
            customerEmail: agent.customerEmail,
            customerNote: agent.customerNote,
            startTime,
            endTime,
            duration: durationSeconds,
            pricePerHour,
            totalPrice,
            paidAt: 0, // unpaid
          };

          // Optimistic local add - langsung nongol di UI, realtime, ga nunggu round-trip
          useTransactionStore.getState().addTransaction(transactionPayload);

          // Persist ke server - id SAMA PERSIS sama yang barusan di-add lokal
          this.saveTransactionToServer(socket, transactionPayload as Transaction);
        }
      }

      this.queueAgentUpdate(connection, (agent, existing) => {
        const merged = { ...agent, isActive: data.isActive };
        const existingData = existing as any;

        const currentExpiresAt = merged.expiresAt;
        const newExpiresAt = data.expiresAt ?? null;
        if (!currentExpiresAt || (newExpiresAt && newExpiresAt > currentExpiresAt)) {
          merged.expiresAt = newExpiresAt;
        }

        if (data.isActive) {
          const existingIsActive = existingData?.isActive;
          if (existingIsActive) {
            if (data.startTime && data.isActive) {
              if (!merged.startTime || data.startTime < merged.startTime) {
                merged.startTime = data.startTime;
              }
            }
          } else {
            if (data.startTime) {
              merged.startTime = data.startTime;
            }
          }
        }

        if (existingData && existingData.isActive) {
          if (!data.customerName && existingData.customerName) merged.customerName = existingData.customerName;
          if (!data.customerPhone && existingData.customerPhone) merged.customerPhone = existingData.customerPhone;
          if (!data.customerEmail && existingData.customerEmail) merged.customerEmail = existingData.customerEmail;
          if (!data.customerNote && existingData.customerNote) merged.customerNote = existingData.customerNote;
        }

        if (data.customerName) (merged as any).customerName = data.customerName;
        if (data.customerPhone) (merged as any).customerPhone = data.customerPhone;
        if (data.customerEmail) (merged as any).customerEmail = data.customerEmail;
        if (data.customerNote) (merged as any).customerNote = data.customerNote;

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

    // Calculate price per block/jam (minimum 1 jam, dibulatkan ke atas)
    const pricePerHour = config.pricePerHour || 50000;
    const totalPrice = Math.ceil(currentDuration / 3600) * pricePerHour;

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
      isConnected, // Reflects the actual current socket connection, not just "agent seen before"
      needsCleaning: agentAny.needsCleaning ?? false,
      lastTransactionEndTime: agentAny.lastTransactionEndTime,
      customerName: agentAny.customerName,
      customerPhone: agentAny.customerPhone,
      customerEmail: agentAny.customerEmail,
      customerNote: agentAny.customerNote,
    };
  }

  private notifyUpdate(): void {
    const billings = this.getRoomBillings();
    this.updateCallbacks.forEach(cb => cb(billings));
  }

  private notifyStatus(roomId: string, connected: boolean): void {
    this.statusCallbacks.forEach(cb => cb(roomId, connected));
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

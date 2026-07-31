import { io, Socket } from 'socket.io-client';
import type { AgentInfo, PlayerState, RoomConfig, RoomBilling } from '../types';
import { useTransactionStore } from '../store/useTransactionStore';

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
      customerName: customerName ?? undefined,
      customerPhone: customerPhone ?? undefined,
      customerEmail: customerEmail ?? undefined,
      customerNote: customerNote ?? undefined,
    });
    console.log('[MultiSocket] Activating room:', roomId, '-> agentRoomId:', agentRoomId, 'duration:', durationMinutes, 'customerName:', customerName);
  }

  // Deactivate a specific room - finds connection by roomId (from agent)
  async deactivateRoom(roomId: string, onComplete?: () => void): Promise<void> {
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
      return;
    }
    
    if (!connection.socket.connected) {
      console.error('[MultiSocket] Cannot deactivate room - not connected:', roomId);
      return;
    }

    const agentRoomId = connection.agents[0]?.roomId || roomId;
    
    // Get billing info before deactivating for transaction record
    const agent = connection.agents[0];
    const pricePerHour = connection.config.pricePerHour || 50000;
    const startTime = agent?.startTime ? new Date(agent.startTime).getTime() : 0;
    // Use expiresAt if available (time purchased), otherwise actual end time
    const endTime = agent?.expiresAt || Date.now();
    const durationSeconds = Math.floor((endTime - startTime) / 1000);
    // Per-block/jam: minimum 1 jam, lalu dibulatkan ke atas
    const totalPrice = Math.max(0, Math.ceil(durationSeconds / 3600) * pricePerHour);
    
    // Get customer info
    const agentAny = agent as any;
    const customerName = agentAny?.customerName;
    const customerPhone = agentAny?.customerPhone;
    const customerEmail = agentAny?.customerEmail;
    const customerNote = agentAny?.customerNote;
    
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
    
    // Record transaction if there was an active session
    if (startTime > 0 && durationSeconds > 0) {
      console.log('[MultiSocket] Recording transaction:', {
        roomId,
        roomName: connection.config.name,
        startTime,
        endTime,
        duration: durationSeconds,
        totalPrice,
        customerName
      });
      
      useTransactionStore.getState().addTransaction({
        roomId,
        roomName: connection.config.name,
        customerName,
        customerPhone,
        customerEmail,
        customerNote,
        startTime,
        endTime,
        duration: durationSeconds,
        pricePerHour,
        totalPrice,
        paidAt: endTime,
      });
      
      // Send transaction to server
      this.saveTransactionToServer(connection.socket, {
        roomId,
        roomName: connection.config.name,
        customerName,
        customerPhone,
        customerEmail,
        customerNote,
        startTime,
        endTime,
        duration: durationSeconds,
        pricePerHour,
        totalPrice,
        paidAt: endTime,
      });
    }
  }

  // Save transaction to server
  private saveTransactionToServer(socket: Socket, transaction: any): void {
    const transactionWithId = {
      ...transaction,
      id: Math.random().toString(36).substring(2, 9) + Date.now().toString(36)
    };
    socket.emit('transaction:save', transactionWithId);
  }

  // Delete transaction on server
  deleteTransaction(transactionId: string, onComplete?: () => void): void {
    const timeoutMs = 3000;
    const timeoutId = setTimeout(() => {
      onComplete?.();
    }, timeoutMs);
    
    // Listen for transaction update from server
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
        conn.socket.emit('transaction:delete', transactionId);
      }
    }
  }

  // Clear all transactions on server
  clearTransactions(onComplete?: () => void): void {
    const timeoutMs = 3000;
    const timeoutId = setTimeout(() => {
      onComplete?.();
    }, timeoutMs);
    
    // Listen for transaction update from server
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
        ? this.agentToBilling(agent, connection.config)
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

    // Listen for transactions from server
    socket.on('transaction:get', (transactions: any[]) => {
      console.log('[MultiSocket] Received transactions from server:', transactions.length);
      useTransactionStore.getState().setTransactions(transactions);
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
          if (existing.startTime && !merged.startTime) merged.startTime = existing.startTime;
          if (existing.expiresAt && !merged.expiresAt) merged.expiresAt = existing.expiresAt;
          if (existing.isActive && !merged.isActive) merged.isActive = existing.isActive;
          // Preserve customer info
          if (existing.customerName && !merged.customerName) merged.customerName = existing.customerName;
          if (existing.customerPhone && !merged.customerPhone) merged.customerPhone = existing.customerPhone;
          if (existing.customerEmail && !merged.customerEmail) merged.customerEmail = existing.customerEmail;
          if (existing.customerNote && !merged.customerNote) merged.customerNote = existing.customerNote;
        }
        return merged;
      });
    });

    // Listen for agent status updates
    socket.on('agent:status', (data: { agent: AgentInfo }) => {
      this.queueAgentUpdate(connection, (agent, existingAgent) => {
        const merged = { ...agent, ...data.agent };
        const existing = existingAgent as any;
        
        // Preserve billing data - use later expiry, earlier startTime
        if (existing) {
          if (existing.expiresAt && (!merged.expiresAt || existing.expiresAt > merged.expiresAt)) {
            merged.expiresAt = existing.expiresAt;
          }
          if (existing.startTime && (!merged.startTime || existing.startTime < merged.startTime)) {
            merged.startTime = existing.startTime;
          }
          if (existing.isActive) merged.isActive = existing.isActive;
          if (existing.customerName) merged.customerName = existing.customerName;
          if (existing.customerPhone) merged.customerPhone = existing.customerPhone;
          if (existing.customerEmail) merged.customerEmail = existing.customerEmail;
          if (existing.customerNote) merged.customerNote = existing.customerNote;
        }
        return merged;
      });
    });

    // Listen for heartbeat updates
    socket.on('agent:heartbeat', (data: { agent: AgentInfo }) => {
      this.queueAgentUpdate(connection, (agent, existingAgent) => {
        const merged = { ...agent, ...data.agent };
        const existing = existingAgent as any;
        
        // Preserve billing data - use later expiry, earlier startTime
        if (existing) {
          if (existing.expiresAt && (!merged.expiresAt || existing.expiresAt > merged.expiresAt)) {
            merged.expiresAt = existing.expiresAt;
          }
          if (existing.startTime && (!merged.startTime || existing.startTime < merged.startTime)) {
            merged.startTime = existing.startTime;
          }
          if (existing.isActive) merged.isActive = existing.isActive;
          if (existing.customerName) merged.customerName = existing.customerName;
          if (existing.customerPhone) merged.customerPhone = existing.customerPhone;
          if (existing.customerEmail) merged.customerEmail = existing.customerEmail;
          if (existing.customerNote) merged.customerNote = existing.customerNote;
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
            // Use earlier startTime (first activation)
            const existingStartTime = existingAgent.startTime;
            const incomingStartTime = incomingAgent.startTime;
            if (existingStartTime && (!incomingStartTime || existingStartTime < incomingStartTime)) {
              incomingAgent.startTime = existingStartTime;
            }
            if (existingAgent.isActive) incomingAgent.isActive = existingAgent.isActive;
            // Preserve customer info
            if (existingAgent.customerName) (incomingAgent as any).customerName = existingAgent.customerName;
            if (existingAgent.customerPhone) (incomingAgent as any).customerPhone = existingAgent.customerPhone;
            if (existingAgent.customerEmail) (incomingAgent as any).customerEmail = existingAgent.customerEmail;
            if (existingAgent.customerNote) (incomingAgent as any).customerNote = existingAgent.customerNote;
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
            // Use earlier startTime (first activation)
            const existingStartTime = existingAgent.startTime;
            const incomingStartTime = incomingAgent.startTime;
            if (existingStartTime && (!incomingStartTime || existingStartTime < incomingStartTime)) {
              incomingAgent.startTime = existingStartTime;
            }
            if (existingAgent.isActive) incomingAgent.isActive = existingAgent.isActive;
            // Preserve customer info
            if (existingAgent.customerName) (incomingAgent as any).customerName = existingAgent.customerName;
            if (existingAgent.customerPhone) (incomingAgent as any).customerPhone = existingAgent.customerPhone;
            if (existingAgent.customerEmail) (incomingAgent as any).customerEmail = existingAgent.customerEmail;
            if (existingAgent.customerNote) (incomingAgent as any).customerNote = existingAgent.customerNote;
          }
        }
        
        connection.agents = agents;
        connection.lastAgentUpdate = timestamp;
        this.notifyUpdate();
      });
    });

    // Listen for room activation updates (includes expiry info)
    socket.on('room:activation', (data: { roomId: string; roomName?: string; isActive: boolean; expiresAt?: number | null; reason?: string; startTime?: number; customerName?: string; customerPhone?: string; customerEmail?: string; customerNote?: string }) => {
      console.log('[MultiSocket] Room activation update:', config.name, data);
      
      // Capture state BEFORE queuing for transaction recording
      const existingAgent = connection.agents[0];
      const wasActive = existingAgent?.isActive === true;
      const isNowInactive = data.isActive === false;
      
      // Record transaction BEFORE queue (to capture current state)
      if (existingAgent && wasActive && isNowInactive) {
        const agent = existingAgent as any;
        const pricePerHour = config.pricePerHour || 50000;
        const startTime = agent.startTime || 0;
        // Use expiresAt if available (time purchased), otherwise actual end time
        const endTime = agent.expiresAt || Date.now();
        const durationSeconds = Math.floor((endTime - startTime) / 1000);
        // Per-block/jam: minimum 1 jam, lalu dibulatkan ke atas
        const totalPrice = Math.max(0, Math.ceil(durationSeconds / 3600) * pricePerHour);
        
        console.log('[MultiSocket] Auto-deactivate: Recording transaction:', {
          roomId: data.roomId,
          roomName: data.roomName || config.name,
          startTime,
          endTime,
          duration: durationSeconds,
          totalPrice,
          customerName: agent.customerName
        });
        
        if (startTime > 0 && durationSeconds > 0) {
          useTransactionStore.getState().addTransaction({
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
            paidAt: endTime,
          });
          
          // Send transaction to server
          this.saveTransactionToServer(socket, {
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
            paidAt: endTime,
          });
        }
      }
      
      // Use queue for state update
      this.queueAgentUpdate(connection, (agent, existing) => {
        const merged = { ...agent, isActive: data.isActive };
        const existingData = existing as any;
        
        // Use later expiresAt (more time remaining) - authoritative source from server
        const currentExpiresAt = merged.expiresAt;
        const newExpiresAt = data.expiresAt ?? null;
        if (!currentExpiresAt || (newExpiresAt && newExpiresAt > currentExpiresAt)) {
          merged.expiresAt = newExpiresAt;
        }
        
        // Use earlier startTime (first activation)
        if (data.startTime && data.isActive) {
          if (!merged.startTime || data.startTime < merged.startTime) {
            merged.startTime = data.startTime;
          }
        }
        
        // Preserve existing customer info if not provided in update
        if (existingData) {
          if (!data.customerName && existingData.customerName) merged.customerName = existingData.customerName;
          if (!data.customerPhone && existingData.customerPhone) merged.customerPhone = existingData.customerPhone;
          if (!data.customerEmail && existingData.customerEmail) merged.customerEmail = existingData.customerEmail;
          if (!data.customerNote && existingData.customerNote) merged.customerNote = existingData.customerNote;
        }
        
        // Override with new customer info if provided
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

  private agentToBilling(agent: AgentInfo, config: RoomConfig): RoomBilling {
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
      isConnected: true, // Agent exists = connected
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

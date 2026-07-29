import { io, Socket } from 'socket.io-client';
import type { AgentInfo, PlayerState, RoomConfig, RoomBilling } from '../types';

type RoomUpdateCallback = (rooms: Map<string, RoomBilling>) => void;
type ConnectionStatusCallback = (roomId: string, connected: boolean) => void;
type ExpiryWarningCallback = (data: { roomId: string; secondsRemaining: number; expiresAt: number }) => void;

interface RoomConnection {
  socket: Socket;
  config: RoomConfig;
  agents: AgentInfo[];
}

class MultiSocketService {
  private connections: Map<string, RoomConnection> = new Map();
  private updateCallbacks: RoomUpdateCallback[] = [];
  private statusCallbacks: ConnectionStatusCallback[] = [];
  private expiryWarningCallbacks: ExpiryWarningCallback[] = [];
  private maxReconnectAttempts = 10;

  // Add a new room connection
  addRoom(config: RoomConfig): void {
    if (this.connections.has(config.id)) {
      console.log('[MultiSocket] Room already connected:', config.id);
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
    };

    this.setupSocketEvents(connection);
    this.connections.set(config.id, connection);
    this.notifyStatus(config.id, false);
    this.notifyUpdate();
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
    customerNote?: string
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
  async deactivateRoom(roomId: string): Promise<void> {
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
    console.log('[MultiSocket] Emitting deactivate-room with roomId:', agentRoomId);
    connection.socket.emit('cashier:deactivate-room', { roomId: agentRoomId });
    console.log('[MultiSocket] Deactivating room:', roomId, '-> agentRoomId:', agentRoomId);
  }

  // Extend room time
  async extendTime(roomId: string, additionalMinutes: number): Promise<void> {
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

    const agentRoomId = connection.agents[0]?.roomId || roomId;
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
      // Preserve billing-related data from existing agent if reconnecting
      const existingAgent = connection.agents[0] as any;
      if (existingAgent) {
        if (existingAgent.startTime && !newAgent.startTime) {
          newAgent.startTime = existingAgent.startTime;
        }
        if (existingAgent.expiresAt && !newAgent.expiresAt) {
          newAgent.expiresAt = existingAgent.expiresAt;
        }
        if (existingAgent.isActive && !newAgent.isActive) {
          newAgent.isActive = existingAgent.isActive;
        }
        // Preserve customer info
        if (existingAgent.customerName && !(newAgent as any).customerName) (newAgent as any).customerName = existingAgent.customerName;
        if (existingAgent.customerPhone && !(newAgent as any).customerPhone) (newAgent as any).customerPhone = existingAgent.customerPhone;
        if (existingAgent.customerEmail && !(newAgent as any).customerEmail) (newAgent as any).customerEmail = existingAgent.customerEmail;
        if (existingAgent.customerNote && !(newAgent as any).customerNote) (newAgent as any).customerNote = existingAgent.customerNote;
      }
      connection.agents = [newAgent];
      this.notifyUpdate();
    });

    // Listen for agent status updates
    socket.on('agent:status', (data: { agent: AgentInfo }) => {
      // Preserve billing-related data - use later expiry, earlier startTime
      const existingAgent = connection.agents[0] as any;
      if (existingAgent) {
        // Use later expiresAt (more time remaining)
        if (existingAgent.expiresAt && (!data.agent.expiresAt || existingAgent.expiresAt > data.agent.expiresAt)) {
          data.agent.expiresAt = existingAgent.expiresAt;
        }
        // Use earlier startTime (first activation)
        if (existingAgent.startTime && (!data.agent.startTime || existingAgent.startTime < data.agent.startTime)) {
          data.agent.startTime = existingAgent.startTime;
        }
        if (existingAgent.isActive) data.agent.isActive = existingAgent.isActive;
        if (existingAgent.customerName) (data.agent as any).customerName = existingAgent.customerName;
        if (existingAgent.customerPhone) (data.agent as any).customerPhone = existingAgent.customerPhone;
        if (existingAgent.customerEmail) (data.agent as any).customerEmail = existingAgent.customerEmail;
        if (existingAgent.customerNote) (data.agent as any).customerNote = existingAgent.customerNote;
      }
      connection.agents = [data.agent];
      this.notifyUpdate();
    });

    // Listen for heartbeat updates
    socket.on('agent:heartbeat', (data: { agent: AgentInfo }) => {
      // Preserve billing-related data - use later expiry, earlier startTime
      const existingAgent = connection.agents[0] as any;
      if (existingAgent) {
        // Use later expiresAt (more time remaining)
        if (existingAgent.expiresAt && (!data.agent.expiresAt || existingAgent.expiresAt > data.agent.expiresAt)) {
          data.agent.expiresAt = existingAgent.expiresAt;
        }
        // Use earlier startTime (first activation)
        if (existingAgent.startTime && (!data.agent.startTime || existingAgent.startTime < data.agent.startTime)) {
          data.agent.startTime = existingAgent.startTime;
        }
        if (existingAgent.isActive) data.agent.isActive = existingAgent.isActive;
        if (existingAgent.customerName) (data.agent as any).customerName = existingAgent.customerName;
        if (existingAgent.customerPhone) (data.agent as any).customerPhone = existingAgent.customerPhone;
        if (existingAgent.customerEmail) (data.agent as any).customerEmail = existingAgent.customerEmail;
        if (existingAgent.customerNote) (data.agent as any).customerNote = existingAgent.customerNote;
      }
      connection.agents = [data.agent];
      this.notifyUpdate();
    });

    // Listen for player state updates
    socket.on('player:state', (data: { roomId: string; player: PlayerState }) => {
      if (connection.agents[0]) {
        connection.agents[0].player = data.player;
        this.notifyUpdate();
      }
    });

    // Listen for bulk agent list
    socket.on('agents:update', (agents: AgentInfo[]) => {
      console.log('[MultiSocket] Agents update for room:', config.name, agents);
      // Don't overwrite billing-related data from agents:update - rely on room:activation for that
      // Just update basic agent info - use later expiry, earlier startTime
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
      this.notifyUpdate();
    });

    socket.on('agents:list', (agents: AgentInfo[]) => {
      console.log('[MultiSocket] Agents list for room:', config.name, agents);
      // Don't overwrite billing-related data from agents:list - rely on room:activation for that
      // Use later expiry, earlier startTime
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
      this.notifyUpdate();
    });

    // Listen for room activation updates (includes expiry info)
    socket.on('room:activation', (data: { roomId: string; roomName?: string; isActive: boolean; expiresAt?: number | null; reason?: string; startTime?: number; customerName?: string; customerPhone?: string; customerEmail?: string; customerNote?: string }) => {
      console.log('[MultiSocket] Room activation update:', config.name, data);
      if (connection.agents[0]) {
        connection.agents[0].isActive = data.isActive;
        
        // Use later expiresAt (more time remaining) - authoritative source from server
        const currentExpiresAt = connection.agents[0].expiresAt;
        const newExpiresAt = data.expiresAt ?? null;
        if (!currentExpiresAt || (newExpiresAt && newExpiresAt > currentExpiresAt)) {
          connection.agents[0].expiresAt = newExpiresAt;
        }
        
        // Use earlier startTime (first activation)
        const currentStartTime = connection.agents[0].startTime;
        if (data.startTime && data.isActive) {
          if (!currentStartTime || data.startTime < currentStartTime) {
            connection.agents[0].startTime = data.startTime;
          }
        }
        
        // Store customer info
        const agent = connection.agents[0] as any;
        if (data.customerName) agent.customerName = data.customerName;
        if (data.customerPhone) agent.customerPhone = data.customerPhone;
        if (data.customerEmail) agent.customerEmail = data.customerEmail;
        if (data.customerNote) agent.customerNote = data.customerNote;
        this.notifyUpdate();
      }
    });

    // Listen for expiry warnings
    socket.on('room:expiry-warning', (data: { roomId: string; secondsRemaining: number; expiresAt: number }) => {
      console.log('[MultiSocket] Expiry warning:', config.name, data);
      if (connection.agents[0]) {
        connection.agents[0].expiresAt = data.expiresAt;
        this.notifyUpdate();
      }
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
      currentDuration = agent.player?.currentTime || 0;
    } else if (agent.status === 'PAUSED' || agent.player?.state === 'paused') {
      status = 'paused';
      currentDuration = agent.player?.currentTime || 0;
    }

    // Calculate price (Rp 50,000 per hour)
    const pricePerHour = 50000;
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
  onUpdate(callback: RoomUpdateCallback): void {
    this.updateCallbacks.push(callback);
    // Send initial data
    callback(this.getRoomBillings());
  }

  // Subscribe to connection status changes
  onStatusChange(callback: ConnectionStatusCallback): void {
    this.statusCallbacks.push(callback);
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

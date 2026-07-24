import { io, Socket } from 'socket.io-client';
import type { AgentInfo, PlayerState, RoomConfig, RoomBilling } from '../types';

type RoomUpdateCallback = (rooms: Map<string, RoomBilling>) => void;
type ConnectionStatusCallback = (roomId: string, connected: boolean) => void;

interface RoomConnection {
  socket: Socket;
  config: RoomConfig;
  agents: AgentInfo[];
}

class MultiSocketService {
  private connections: Map<string, RoomConnection> = new Map();
  private updateCallbacks: RoomUpdateCallback[] = [];
  private statusCallbacks: ConnectionStatusCallback[] = [];
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
  async activateRoom(roomId: string, roomName: string): Promise<void> {
    console.log('[MultiSocket] activateRoom called with roomId:', roomId);
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
    connection.socket.emit('cashier:activate-room', { roomId: agentRoomId, roomName });
    console.log('[MultiSocket] Activating room:', roomId, '-> agentRoomId:', agentRoomId);
  }

  // Deactivate a specific room - finds connection by roomId (from agent)
  async deactivateRoom(roomId: string): Promise<void> {
    console.log('[MultiSocket] deactivateRoom called with roomId:', roomId);
    
    let connection: RoomConnection | undefined;
    
    // Find connection by matching roomId (from agent) or config.id
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
      console.error('[MultiSocket] Cannot deactivate room - not connected:', roomId);
      return;
    }

    const agentRoomId = connection.agents[0]?.roomId || roomId;
    connection.socket.emit('cashier:deactivate-room', { roomId: agentRoomId });
    console.log('[MultiSocket] Deactivating room:', roomId, '-> agentRoomId:', agentRoomId);
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
    socket.on('agent:register', (agent: AgentInfo) => {
      console.log('[MultiSocket] Agent registered:', config.name, agent);
      connection.agents = [agent];
      this.notifyUpdate();
    });

    // Listen for agent status updates
    socket.on('agent:status', (data: { agent: AgentInfo }) => {
      connection.agents = [data.agent];
      this.notifyUpdate();
    });

    // Listen for heartbeat updates
    socket.on('agent:heartbeat', (data: { agent: AgentInfo }) => {
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
      connection.agents = agents;
      this.notifyUpdate();
    });

    socket.on('agents:list', (agents: AgentInfo[]) => {
      console.log('[MultiSocket] Agents list for room:', config.name, agents);
      connection.agents = agents;
      this.notifyUpdate();
    });
  }

  private agentToBilling(agent: AgentInfo, config: RoomConfig): RoomBilling {
    const roomId = agent.roomId || config.id;
    const roomName = agent.roomName || config.name;

    let status: 'idle' | 'playing' | 'paused' = 'idle';
    let startTime: number | null = null;
    let currentDuration = 0;

    // Determine status from agent
    if (agent.status === 'PLAYING' || agent.player?.state === 'playing') {
      status = 'playing';
      startTime = Date.now();
      currentDuration = agent.player?.currentTime || 0;
    } else if (agent.status === 'PAUSED' || agent.player?.state === 'paused') {
      status = 'paused';
      currentDuration = agent.player?.currentTime || 0;
    }

    // Calculate price (Rp 50,000 per hour)
    const pricePerHour = 50000;
    const totalPrice = Math.ceil(currentDuration / 3600) * pricePerHour;

    return {
      roomId,
      roomName,
      startTime,
      currentDuration,
      totalPrice,
      status,
      pricePerHour,
      isActive: agent.isActive ?? false,
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

  // Disconnect all
  disconnectAll(): void {
    for (const [id] of this.connections) {
      this.removeRoom(id);
    }
  }
}

// Singleton instance
export const multiSocketService = new MultiSocketService();

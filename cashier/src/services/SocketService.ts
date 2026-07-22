import { io, Socket } from 'socket.io-client';
import { getServerUrl } from '../utils/getServerUrl';
import type { AgentInfo, PlayerState } from '../types';

type AgentUpdateCallback = (agents: AgentInfo[]) => void;

class SocketService {
  private socket: Socket | null = null;
  private agentUpdateCallbacks: AgentUpdateCallback[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;

  connect() {
    if (this.socket?.connected) {
      return;
    }

    const serverUrl = getServerUrl();
    console.log('[Cashier] Connecting to server:', serverUrl);

    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    this.socket.on('connect', () => {
      console.log('[Cashier] Connected to server');
      this.reconnectAttempts = 0;
      
      // Request agent list after connection
      this.socket?.emit('cashier:request-agents');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Cashier] Disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('[Cashier] Connection error:', error);
      this.reconnectAttempts++;
    });

    // Listen for agent registration updates
    this.socket.on('agent:register', (agent: AgentInfo) => {
      console.log('[Cashier] Agent registered:', agent);
      this.notifyAgentUpdate();
    });

    // Listen for agent status updates
    this.socket.on('agent:status', (data: { agent: AgentInfo }) => {
      console.log('[Cashier] Agent status update:', data.agent);
      this.notifyAgentUpdate();
    });

    // Listen for heartbeat updates
    this.socket.on('agent:heartbeat', (data: { agent: AgentInfo }) => {
      console.log('[Cashier] Agent heartbeat:', data.agent);
      this.notifyAgentUpdate();
    });

    // Listen for player state updates
    this.socket.on('player:state', (data: { roomId: string; player: PlayerState }) => {
      console.log('[Cashier] Player state update:', data);
      this.notifyAgentUpdate();
    });

    // Listen for player update (from server)
    this.socket.on('player:update', (data: { agentId: string; player: PlayerState }) => {
      console.log('[Cashier] Player update:', data);
      this.notifyAgentUpdate();
    });

    // Listen for bulk agent list (from server - main event)
    this.socket.on('agents:update', (agents: AgentInfo[]) => {
      console.log('[Cashier] Agents update:', agents);
      this.agentUpdateCallbacks.forEach(cb => cb(agents));
    });

    // Listen for agents:list as fallback
    this.socket.on('agents:list', (agents: AgentInfo[]) => {
      console.log('[Cashier] Agents list:', agents);
      this.agentUpdateCallbacks.forEach(cb => cb(agents));
    });
  }

  private notifyAgentUpdate() {
    // Server will automatically broadcast via agents:update
    // No need to request explicitly
  }

  onAgentUpdate(callback: AgentUpdateCallback) {
    this.agentUpdateCallbacks.push(callback);
    
    // Ensure socket is connected first
    this.connect();
    
    // If already connected, request immediately
    if (this.socket?.connected) {
      console.log('[Cashier] Already connected, requesting agents...');
      this.socket.emit('cashier:request-agents');
    } else {
      console.log('[Cashier] Not connected yet, waiting for connect...');
      // Wait for connection, then request
      const onConnect = () => {
        console.log('[Cashier] Connected, requesting agents...');
        this.socket?.emit('cashier:request-agents');
        // Remove this listener after first connect
        this.socket?.off('connect', onConnect);
      };
      this.socket?.on('connect', onConnect);
    }
    
    return () => {
      this.agentUpdateCallbacks = this.agentUpdateCallbacks.filter(cb => cb !== callback);
    };
  }

  // Activate a room (send to server)
  activateRoom(roomId: string, roomName: string) {
    console.log('[Cashier] Activating room:', roomId, roomName);
    this.socket?.emit('cashier:activate-room', { roomId, roomName });
  }

  // Deactivate a room (send to server)
  deactivateRoom(roomId: string) {
    console.log('[Cashier] Deactivating room:', roomId);
    this.socket?.emit('cashier:deactivate-room', { roomId });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export const socketService = new SocketService();

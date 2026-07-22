// Types for Cashier Application

export type AgentStatus = 'ONLINE' | 'OFFLINE' | 'PLAYING' | 'PAUSED';

export interface Room {
  id: string;
  name: string;
  status: RoomStatus;
  startTime: number | null;
  elapsedSeconds: number;
  pricePerHour: number;
}

export type RoomStatus = 'idle' | 'playing' | 'paused';

export interface RoomBilling {
  roomId: string;
  roomName: string;
  startTime: number | null;
  currentDuration: number; // in seconds
  totalPrice: number;
  status: RoomStatus;
  pricePerHour?: number;
}

// Match server's PlayerState
export interface PlayerState {
  state: string;
  videoId: string | null;
  title: string | null;
  duration: number;
  currentTime: number;
  volume: number;
  muted: boolean;
}

// Match server's AgentInfo
export interface AgentInfo {
  id: string;
  socketId?: string;
  name: string;
  roomId: string;
  roomName: string;
  status: AgentStatus;
  lastHeartbeat: number;
  connectedAt: number;
  player?: PlayerState;
  connected?: boolean;
}

// Types for Cashier Application

export type AgentStatus = 'ONLINE' | 'OFFLINE' | 'PLAYING' | 'PAUSED' | 'WAITING';

// Room configuration - loaded from VITE_ROOMS environment variable
export interface RoomConfig {
  id: string;
  name: string;
  roomId?: string; // Optional roomId from env (maps to agent's ROOM_ID)
  ip: string;
  port: number;
}

// Room from agent connection
export interface Room {
  id: string;
  name: string;
  ip?: string;
  port?: number;
  status: RoomStatus;
  startTime: number | null;
  elapsedSeconds: number;
  pricePerHour: number;
}

export type RoomStatus = 'idle' | 'playing' | 'paused';

// Paket harga tetap untuk sebuah ruangan (dari server/.env PACKAGES ruangan tsb)
export interface Package {
  id: string;
  name: string;
  durationMinutes: number;
  price: number;
}

export interface RoomBilling {
  roomId: string;
  roomName: string;
  startTime: number | null;
  currentDuration: number; // in seconds
  totalPrice: number;
  status: RoomStatus;
  pricePerHour?: number;
  isActive: boolean; // apakah ruangan sudah diaktifkan oleh cashier
  expiresAt: number | null; // Timestamp when room expires (null if no duration set)
  isConnected: boolean; // apakah socket terhubung ke server
  needsCleaning: boolean; // perlu bersihkan ruangan setelah customer selesai
  lastTransactionEndTime?: number; // Waktu selesai transaksi terakhir (untuk menentukan perlu bersih)
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerNote?: string;
  activePackageId?: string | null; // Paket yang dipilih untuk sesi berjalan saat ini
  packagePrice?: number | null;
  packageDurationMinutes?: number | null;
  packages?: Package[]; // Daftar paket tersedia di ruangan ini (untuk selector saat aktivasi)
}

// Transaction for payment recording
export interface Transaction {
  id: string;
  roomId: string;
  roomName: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerNote?: string;
  startTime: number;
  endTime: number;
  duration: number; // in seconds
  pricePerHour: number;
  totalPrice: number;
  packageId?: string | null;
  packageName?: string | null;
  packagePrice?: number | null;
  paymentMethod?: 'cash' | 'transfer' | 'other';
  paidAt: number; // 0 = unpaid, > 0 = paid (timestamp when payment was confirmed)
  cleanedAt?: number; // timestamp when room was marked as cleaned (BERSIHKAN → SUDAH DIBERSIHKAN)
  notes?: string;
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
  isActive?: boolean;
  pricePerHour?: number; // Tarif per jam, dari server/.env PRICE_PER_HOUR ruangan tsb
  expiresAt?: number | null; // Timestamp when room expires
  startTime?: number | null; // Timestamp when room was activated (for billing)
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerNote?: string;
  packages?: Package[]; // Daftar paket tersedia di ruangan ini, dari server/.env PACKAGES
  activePackageId?: string | null;
  packagePrice?: number | null;
  packageDurationMinutes?: number | null;
}

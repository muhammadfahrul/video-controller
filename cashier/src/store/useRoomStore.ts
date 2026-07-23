import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { RoomConfig } from '../types';
import { multiSocketService } from '../services/MultiSocketService';

interface RoomStore {
  roomConfigs: RoomConfig[];
  connectionStatus: Map<string, boolean>;
  
  // Actions
  addRoom: (config: Omit<RoomConfig, 'id'>) => void;
  removeRoom: (roomId: string) => void;
  setRoomConnected: (roomId: string, connected: boolean) => void;
  getRoomConfig: (roomId: string) => RoomConfig | undefined;
  reconnectAll: () => void;
  initFromEnv: () => void;
}

// Generate unique ID
const generateId = () => Math.random().toString(36).substring(2, 9);

// Helper to ensure connectionStatus is always a Map
function normalizeConnectionStatus(status: unknown): Map<string, boolean> {
  if (status instanceof Map) {
    return status;
  }
  if (status && typeof status === 'object') {
    return new Map(Object.entries(status as Record<string, boolean>));
  }
  return new Map();
}

// Load rooms from .env
function loadRoomsFromEnv(): RoomConfig[] {
  try {
    const envRooms = import.meta.env.VITE_ROOMS;
    if (!envRooms) return [];
    
    const parsed = JSON.parse(envRooms);
    if (!Array.isArray(parsed)) return [];
    
    return parsed.map((room: { name: string; ip: string; port: number }, index: number) => ({
      id: `env-room-${index}`,
      name: room.name || `Room ${index + 1}`,
      ip: room.ip || '127.0.0.1',
      port: room.port || 53331,
    }));
  } catch (e) {
    console.error('[Store] Failed to parse VITE_ROOMS:', e);
    return [];
  }
}

export const useRoomStore = create<RoomStore>()(
  persist(
    (set, get) => ({
      roomConfigs: [],
      connectionStatus: new Map(),
      
      addRoom: (config) => {
        const id = generateId();
        const newConfig: RoomConfig = { ...config, id };
        
        set((state) => ({
          roomConfigs: [...state.roomConfigs, newConfig],
        }));
        
        // Connect to the room server
        multiSocketService.addRoom(newConfig);
      },
      
      removeRoom: (roomId) => {
        set((state) => ({
          roomConfigs: state.roomConfigs.filter(r => r.id !== roomId),
        }));
        
        multiSocketService.removeRoom(roomId);
      },
      
      setRoomConnected: (roomId, connected) => {
        set((state) => {
          const statusMap = normalizeConnectionStatus(state.connectionStatus);
          statusMap.set(roomId, connected);
          return { connectionStatus: statusMap };
        });
      },
      
      getRoomConfig: (roomId) => {
        return get().roomConfigs.find(r => r.id === roomId);
      },
      
      reconnectAll: () => {
        const { roomConfigs } = get();
        // Disconnect all first
        multiSocketService.disconnectAll();
        // Reconnect to all rooms
        roomConfigs.forEach(config => {
          multiSocketService.addRoom(config);
        });
      },
      
      initFromEnv: () => {
        const envRooms = loadRoomsFromEnv();
        const { roomConfigs: existingConfigs } = get();
        
        // Only add env rooms if no existing configs
        if (existingConfigs.length === 0 && envRooms.length > 0) {
          console.log('[Store] Initializing rooms from .env:', envRooms);
          set({ roomConfigs: envRooms });
          // Connect to all env rooms
          envRooms.forEach(config => {
            multiSocketService.addRoom(config);
          });
        }
      },
    }),
    {
      name: 'cashier-rooms',
    }
  )
);

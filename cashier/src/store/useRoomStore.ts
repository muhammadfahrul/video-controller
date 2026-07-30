import { create } from 'zustand';
import type { RoomConfig } from '../types';
import { multiSocketService } from '../services/MultiSocketService';

interface RoomStore {
  roomConfigs: RoomConfig[];
  connectionStatus: Map<string, boolean>;
  isLoading: boolean;
  
  // Actions
  addRoom: (config: Omit<RoomConfig, 'id'>) => Promise<void>;
  removeRoom: (roomId: string) => void;
  setRoomConnected: (roomId: string, connected: boolean) => void;
  getRoomConfig: (roomId: string) => RoomConfig | undefined;
  reconnectAll: () => void;
  initFromEnv: () => void;
  setLoading: (loading: boolean) => void;
}

// Generate unique ID
const generateId = () => Math.random().toString(36).substring(2, 9);

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
  (set, get) => ({
    // Always initialize from .env - never from storage
    roomConfigs: loadRoomsFromEnv(),
    connectionStatus: new Map(),
    isLoading: false,
    
    addRoom: async (config) => {
      set({ isLoading: true });
      try {
        const id = generateId();
        const newConfig: RoomConfig = { ...config, id };
        
        set((state) => ({
          roomConfigs: [...state.roomConfigs, newConfig],
        }));
        
        // Connect to the room server with callback
        await new Promise<void>((resolve) => {
          multiSocketService.addRoom(newConfig, () => {
            resolve();
          });
          // Fallback timeout
          setTimeout(resolve, 5000);
        });
      } finally {
        set({ isLoading: false });
      }
    },
    
    removeRoom: (roomId) => {
      set((state) => ({
        roomConfigs: state.roomConfigs.filter(r => r.id !== roomId),
      }));
      
      multiSocketService.removeRoom(roomId);
    },
    
    setRoomConnected: (roomId, connected) => {
      set((state) => {
        const newStatus = new Map(state.connectionStatus);
        newStatus.set(roomId, connected);
        return { connectionStatus: newStatus };
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
    
    setLoading: (loading) => {
      set({ isLoading: loading });
    },
    
    initFromEnv: () => {
      const envRooms = loadRoomsFromEnv();
      console.log('[Store] Loading rooms from .env:', envRooms);
      
      set({ roomConfigs: envRooms });
      
      // Only add rooms that don't have existing connections
      const existingConnections = multiSocketService.getRooms();
      const existingIds = new Set(existingConnections.map(c => c.id));
      
      envRooms.forEach(config => {
        if (!existingIds.has(config.id)) {
          multiSocketService.addRoom(config);
        }
      });
    },
  })
);

// Initialize from .env on module load
const initialRooms = loadRoomsFromEnv();
if (initialRooms.length > 0) {
  initialRooms.forEach(config => {
    multiSocketService.addRoom(config);
  });
}

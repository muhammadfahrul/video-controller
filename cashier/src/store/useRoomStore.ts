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
    }),
    {
      name: 'cashier-rooms',
    }
  )
);

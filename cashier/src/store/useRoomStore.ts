import { create } from 'zustand';
import type { RoomConfig } from '../types';
import { multiSocketService } from '../services/MultiSocketService';
import type { LoadingMessage } from '../components/FullPageLoading';

interface RoomStore {
  roomConfigs: RoomConfig[];
  connectionStatus: Map<string, boolean>;
  isLoading: boolean;
  loadingType: LoadingMessage;
  loadingMessage: string;

  // Actions
  addRoom: (config: Omit<RoomConfig, 'id'>) => Promise<void>;
  removeRoom: (roomId: string) => void;
  setRoomConnected: (roomId: string, connected: boolean) => void;
  getRoomConfig: (roomId: string) => RoomConfig | undefined;
  reconnectAll: () => void;
  initFromEnv: () => void;
  setLoading: (loading: boolean, type?: LoadingMessage, message?: string) => void;
}

// Generate unique ID
const generateId = () => Math.random().toString(36).substring(2, 9);

// Load rooms from .env
function loadRoomsFromEnv(): RoomConfig[] {
  try {
    const envRooms = import.meta.env.VITE_ROOMS;
    if (!envRooms) {
      console.warn('[Store] VITE_ROOMS tidak di-set di .env. PC Kasir tidak akan bisa terhubung ke ruangan manapun.');
      return [];
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(envRooms);
    } catch (e) {
      console.error('[Store] Gagal parse VITE_ROOMS. Pastikan format JSON valid:', e);
      console.error('[Store] Contoh: [{"roomId":"room-001","name":"Room 1","ip":"192.168.1.10","port":53331,"pricePerHour":50000}]');
      return [];
    }

    if (!Array.isArray(parsed)) {
      console.error('[Store] VITE_ROOMS harus berupa JSON array.');
      return [];
    }

    const seenRoomIds = new Set<string>();
    const seenIps = new Map<string, number>(); // ip -> count

    return parsed.map((room: any, index: number) => {
      const roomId = room.roomId || `env-room-${index}`;

      // Validasi roomId wajib
      if (!room.roomId) {
        console.warn(`[Store] Ruangan #${index + 1} (${room.name || 'tanpa nama'}) tidak punya 'roomId'. Disarankan isi 'roomId' agar sinkron dengan agent (.env ROOM_ID).`);
      }

      // Validasi IP tidak kosong
      const ip = room.ip || '127.0.0.1';
      if (!room.ip) {
        console.warn(`[Store] Ruangan #${index + 1} (${room.name || roomId}) tidak punya 'ip'. Default ke 127.0.0.1.`);
      }

      const port = room.port || 53331;

      // Validasi duplikat
      if (seenRoomIds.has(roomId)) {
        console.warn(`[Store] Duplikat roomId terdeteksi: '${roomId}'. Pastikan setiap ruangan punya roomId unik.`);
      }
      seenRoomIds.add(roomId);

      // Info shared IP (tidak masalah, hanya warning)
      const ipCount = seenIps.get(`${ip}:${port}`) || 0;
      seenIps.set(`${ip}:${port}`, ipCount + 1);

      return {
        id: roomId,
        name: room.name || `Room ${index + 1}`,
        roomId: room.roomId,
        ip,
        port,
        pricePerHour: room.pricePerHour ?? 50000,
      };
    });
  } catch (e) {
    console.error('[Store] Gagal load VITE_ROOMS:', e);
    return [];
  }
}

export const useRoomStore = create<RoomStore>()(
  (set, get) => ({
    // Always initialize from .env - never from storage
    roomConfigs: loadRoomsFromEnv(),
    connectionStatus: new Map(),
    isLoading: false,
    loadingType: 'loading',
    loadingMessage: '',
    
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
    
    setLoading: (loading, type = 'loading', message = '') => {
      set({ isLoading: loading, loadingType: type, loadingMessage: message });
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

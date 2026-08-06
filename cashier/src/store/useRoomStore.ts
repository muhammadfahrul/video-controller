import { create } from 'zustand';
import type { RoomConfig, Transaction } from '../types';
import { multiSocketService } from '../services/MultiSocketService';
import type { LoadingMessage } from '../components/FullPageLoading';

interface RoomStore {
  roomConfigs: RoomConfig[];
  connectionStatus: Map<string, boolean>;
  isLoading: boolean;
  loadingType: LoadingMessage;
  loadingMessage: string;
  
  // Transaction data per room
  transactions: Map<string, Transaction[]>;
  // Modal state
  selectedRoomId: string | null;
  isTransactionModalOpen: boolean;
  
  // Actions
  addRoom: (config: Omit<RoomConfig, 'id'>) => Promise<void>;
  removeRoom: (roomId: string) => void;
  setRoomConnected: (roomId: string, connected: boolean) => void;
  getRoomConfig: (roomId: string) => RoomConfig | undefined;
  reconnectAll: () => void;
  initFromEnv: () => void;
  setLoading: (loading: boolean, type?: LoadingMessage, message?: string) => void;
  
  // Transaction actions
  setTransactions: (roomId: string, transactions: Transaction[]) => void;
  addTransaction: (roomId: string, transaction: Omit<Transaction, 'id'>) => void;
  removeTransaction: (roomId: string, transactionId: string) => void;
  clearTransactions: (roomId: string) => void;
  getTransactionsByRoom: (roomId: string) => Transaction[];
  getTotalRevenue: (roomId: string) => number;
  getTodayRevenue: (roomId: string) => number;
  getAllRoomsRevenue: () => number;
  getAllRoomsTodayRevenue: () => number;
  
  // Modal actions
  openTransactionModal: (roomId: string) => void;
  closeTransactionModal: () => void;
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
    
    return parsed.map((room: { name: string; roomId?: string; ip: string; port: number; pricePerHour?: number }, index: number) => ({
      id: room.roomId || `env-room-${index}`, // Pakai roomId jika ada, fallback ke env-room-{index}
      name: room.name || `Room ${index + 1}`,
      roomId: room.roomId,
      ip: room.ip || '127.0.0.1',
      port: room.port || 53331,
      pricePerHour: room.pricePerHour || 50000, // Default Rp 50,000 jika tidak ada
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
    
    // Transaction state
    transactions: new Map(),
    selectedRoomId: null,
    isTransactionModalOpen: false,
    
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
    
    // Transaction actions
    setTransactions: (roomId, transactions) => {
      set((state) => {
        const newTransactions = new Map(state.transactions);
        newTransactions.set(roomId, transactions);
        return { transactions: newTransactions };
      });
    },
    
    addTransaction: (roomId, transaction) => {
      const newTransaction: Transaction = {
        ...transaction,
        id: Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
      };
      
      set((state) => {
        const newTransactions = new Map(state.transactions);
        const existing = newTransactions.get(roomId) || [];
        newTransactions.set(roomId, [newTransaction, ...existing]);
        return { transactions: newTransactions };
      });
    },
    
    removeTransaction: (roomId, transactionId) => {
      set((state) => {
        const newTransactions = new Map(state.transactions);
        const existing = newTransactions.get(roomId) || [];
        newTransactions.set(roomId, existing.filter(t => t.id !== transactionId));
        return { transactions: newTransactions };
      });
    },
    
    clearTransactions: (roomId) => {
      set((state) => {
        const newTransactions = new Map(state.transactions);
        newTransactions.set(roomId, []);
        return { transactions: newTransactions };
      });
    },
    
    getTransactionsByRoom: (roomId) => {
      return get().transactions.get(roomId) || [];
    },
    
    getTotalRevenue: (roomId) => {
      const transactions = get().transactions.get(roomId) || [];
      return transactions.reduce((sum, t) => sum + t.totalPrice, 0);
    },
    
    getTodayRevenue: (roomId) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStart = today.getTime();
      
      const transactions = get().transactions.get(roomId) || [];
      return transactions
        .filter(t => t.paidAt >= todayStart)
        .reduce((sum, t) => sum + t.totalPrice, 0);
    },
    
    getAllRoomsRevenue: () => {
      let total = 0;
      get().transactions.forEach((transactions) => {
        total += transactions.reduce((sum, t) => sum + t.totalPrice, 0);
      });
      return total;
    },
    
    getAllRoomsTodayRevenue: () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStart = today.getTime();
      
      let total = 0;
      get().transactions.forEach((transactions) => {
        total += transactions
          .filter(t => t.paidAt >= todayStart)
          .reduce((sum, t) => sum + t.totalPrice, 0);
      });
      return total;
    },
    
    // Modal actions
    openTransactionModal: (roomId) => {
      set({ selectedRoomId: roomId, isTransactionModalOpen: true });
    },
    
    closeTransactionModal: () => {
      set({ selectedRoomId: null, isTransactionModalOpen: false });
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

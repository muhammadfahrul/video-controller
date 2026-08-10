import { create } from 'zustand';
import type { Transaction } from '../types';
import type { LoadingMessage } from '../components/FullPageLoading';

interface TransactionStore {
  transactions: Transaction[];
  isLoading: boolean;
  loadingType: LoadingMessage;
  loadingMessage: string;
  
  // Actions
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  removeTransaction: (id: string) => void;
  /** Clears transactions for the given room (matched by roomId or roomName). Clears everything if both are omitted. */
  clearTransactions: (roomId?: string, roomName?: string) => void;
  /**
   * Merge transactions from one server into the store.
   *
   * Topologi (PRD §1): cashier konek ke N server ruangan (1 socket per ruangan).
   * Tiap server punya SQLite sendiri, jadi transaksi Ruangan 1 != Ruangan 2.
   *
   * `sourceRoomId` (optional): roomId dari server yg mengirim data ini.
   *   - Kalau di-set, orphan dengan roomId BERBEDA dipertahankan
   *     (mungkin dari server lain, jangan drop).
   *   - Kalau null/undefined, orphan policy lama: drop kalau paidAt === 0
   *     & cleanedAt kosong.
   *
   * Merge rules:
   *   - Server wins untuk data yang ada di kedua sisi (source of truth).
   *   - Local wins untuk field 'cleanedAt' kalau local > server (offline mark cleaned).
   *   - Orphan (local-only) dengan cleanedAt → drop (assume server sudah sync).
   */
  setTransactions: (transactions: Transaction[], sourceRoomId?: string) => void;
  getTransactionsByRoom: (roomId: string) => Transaction[];
  getTransactionsByDateRange: (startDate: number, endDate: number) => Transaction[];
  getTotalRevenue: () => number;
  getTodayRevenue: () => number;
  setLoading: (loading: boolean, type?: LoadingMessage, message?: string) => void;
}

// Generate unique ID
const generateId = () => Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

export const useTransactionStore = create<TransactionStore>()(
  (set, get) => ({
    transactions: [],
    isLoading: false,
    loadingType: 'loading',
    loadingMessage: '',
    
    addTransaction: (transaction) => {
      const newTransaction: Transaction = {
        ...transaction,
        id: generateId(),
      };
      
      set((state) => ({
        transactions: [newTransaction, ...state.transactions],
      }));
    },
    
    removeTransaction: (id) => {
      set((state) => ({
        transactions: state.transactions.filter(t => t.id !== id),
      }));
    },
    
    updateTransaction: (id, updates) => {
      set((state) => ({
        transactions: state.transactions.map(t => 
          t.id === id ? { ...t, ...updates } : t
        ),
      }));
    },
    
    clearTransactions: (roomId, roomName) => {
      if (!roomId && !roomName) {
        set({ transactions: [] });
        return;
      }
      const roomKey = roomId?.toLowerCase();
      const roomNameKey = roomName?.toLowerCase();
      set((state) => ({
        transactions: state.transactions.filter(t => {
          const matchesRoom =
            (!!roomKey && t.roomId.toLowerCase() === roomKey) ||
            (!!roomNameKey && t.roomName.toLowerCase() === roomNameKey);
          return !matchesRoom;
        }),
      }));
    },
    
    // Set transactions from server - merge with existing local state.
    //
    // Topologi (PRD §1): cashier konek ke N server ruangan (1 socket per ruangan).
    // Setiap server punya SQLite sendiri, jadi transaksi Ruangan 1 != Ruangan 2.
    //
    // Penyimpanan di cashier: FLAT LIST.
    //   - Key unik = 'id'.
    //   - Server wins untuk data yang ada di kedua sisi (source of truth).
    //   - Local wins untuk field 'cleanedAt' kalau local > server (offline mark cleaned).
    //   - Orphan (local-only):
    //       * cleanedAt  -> drop (assume server sudah sync)
    //       * kalau sourceRoomId di-set dan localTx.roomId != sourceRoomId
    //         -> keep (mungkin dari server lain)
    //       * kalau sourceRoomId cocok dengan localTx.roomId
    //         -> apply legacy policy (paidAt check)
    setTransactions: (serverTransactions, sourceRoomId) => {
      const currentTransactions = get().transactions;

      console.log('[TransactionStore] setTransactions - current:', currentTransactions.length, 'server:', serverTransactions.length, 'sourceRoomId:', sourceRoomId);

      // Dedupe server list (keep first occurrence per id)
      const seenServerIds = new Set<string>();
      const serverDeduped: Transaction[] = [];
      for (const t of serverTransactions) {
        if (seenServerIds.has(t.id)) continue;
        seenServerIds.add(t.id);
        serverDeduped.push(t);
      }

      const serverMap = new Map<string, Transaction>();
      serverDeduped.forEach(t => serverMap.set(t.id, t));

      const merged: Transaction[] = [];
      const localIdsInServer = new Set<string>();

      // Process local transactions
      currentTransactions.forEach(localTx => {
        const serverTx = serverMap.get(localTx.id);

        if (serverTx) {
          localIdsInServer.add(serverTx.id);
          const localCleanedAt = localTx.cleanedAt ?? 0;
          const serverCleanedAt = serverTx.cleanedAt ?? 0;

          if (localCleanedAt && localCleanedAt > serverCleanedAt) {
            // Local cleanedAt lebih baru - server fields + keep local cleanedAt
            merged.push({ ...serverTx, cleanedAt: localTx.cleanedAt });
          } else {
            merged.push(serverTx);
          }
        } else {
          // Orphan - decide
          if (localTx.cleanedAt) {
            console.log('[TransactionStore] Drop orphan (cleaned):', localTx.id);
            return;
          }

          // Multi-server safety: kalau sourceRoomId di-set dan localTx.roomId beda,
          // kemungkinan data dari server lain - keep.
          if (sourceRoomId && localTx.roomId && localTx.roomId !== sourceRoomId) {
            console.log('[TransactionStore] Keep orphan (different room):', localTx.id, 'localRoom:', localTx.roomId, 'sourceRoom:', sourceRoomId);
            merged.push(localTx);
            return;
          }

          // Legacy policy untuk same-room orphan
          if (localTx.paidAt > 0) {
            console.log('[TransactionStore] Keep orphan (paid):', localTx.id);
            merged.push(localTx);
          } else {
            console.log('[TransactionStore] Drop orphan (unpaid/incomplete):', localTx.id);
          }
        }
      });

      // Add server-only transactions
      serverDeduped.forEach(serverTx => {
        if (!localIdsInServer.has(serverTx.id)) {
          if (!merged.find(m => m.id === serverTx.id)) {
            merged.push(serverTx);
          }
        }
      });

      // Final defensive dedupe
      const finalSeen = new Set<string>();
      const deduplicated = merged.filter(t => {
        if (finalSeen.has(t.id)) return false;
        finalSeen.add(t.id);
        return true;
      });

      console.log('[TransactionStore] Merge result:', deduplicated.length, '(from local:', currentTransactions.length, '+ server:', serverTransactions.length, ')');

      // Commit merged result to store
      set({ transactions: deduplicated });
    },
    
    setLoading: (loading, type = 'loading', message = '') => {
      set({ isLoading: loading, loadingType: type, loadingMessage: message });
    },
    
    getTransactionsByRoom: (roomId) => {
      return get().transactions.filter(t => t.roomId === roomId);
    },
    
    getTransactionsByDateRange: (startDate, endDate) => {
      return get().transactions.filter(t => t.paidAt >= startDate && t.paidAt <= endDate);
    },
    
    getTotalRevenue: () => {
      // Only count paid transactions, consistent with getTodayRevenue below.
      return get().transactions
        .filter(t => t.paidAt > 0)
        .reduce((sum, t) => sum + t.totalPrice, 0);
    },

    getTodayRevenue: () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStart = today.getTime();

      return get().transactions
        .filter(t => t.paidAt > 0 && t.paidAt >= todayStart)
        .reduce((sum, t) => sum + t.totalPrice, 0);
    },
  })
);

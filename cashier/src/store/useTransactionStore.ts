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
  clearTransactions: () => void;
  setTransactions: (transactions: Transaction[]) => void;
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
    
    clearTransactions: () => {
      set({ transactions: [] });
    },
    
    // Set transactions from server - merge with any pending local updates
    // This prevents server data from overwriting local changes (like cleanedAt)
    setTransactions: (serverTransactions) => {
      const currentTransactions = get().transactions;
      
      console.log('[TransactionStore] setTransactions called - current:', currentTransactions.length, 'server:', serverTransactions.length);
      
      // Check for duplicates in current
      const currentIds = currentTransactions.map(t => t.id);
      const currentDuplicates = currentIds.filter((id, i) => currentIds.indexOf(id) !== i);
      if (currentDuplicates.length > 0) {
        console.log('[TransactionStore] DUPLICATES in current:', currentDuplicates);
      }
      
      // Check for duplicates in server
      const serverIds = serverTransactions.map(t => t.id);
      const serverDuplicates = serverIds.filter((id, i) => serverIds.indexOf(id) !== i);
      if (serverDuplicates.length > 0) {
        console.log('[TransactionStore] DUPLICATES in server:', serverDuplicates);
      }
      
      // Debug: Show which transactions are only in local
      const localOnly = currentTransactions.filter(ct => !serverTransactions.find(st => st.id === ct.id));
      if (localOnly.length > 0) {
        console.log('[TransactionStore] Transactions only in local:', localOnly.map(t => ({ id: t.id, cleanedAt: t.cleanedAt, paidAt: t.paidAt })));
      }
      
      // Debug: Show which transactions are only in server
      const serverOnly = serverTransactions.filter(st => !currentTransactions.find(ct => ct.id === st.id));
      if (serverOnly.length > 0) {
        console.log('[TransactionStore] Transactions only in server:', serverOnly.map(t => ({ id: t.id, cleanedAt: t.cleanedAt, paidAt: t.paidAt })));
      }
      
      // If no local changes, just use server data
      const hasLocalChanges = currentTransactions.some(t => 
        t.cleanedAt && !serverTransactions.find(st => st.id === t.id && st.cleanedAt === t.cleanedAt)
      );
      
      if (!hasLocalChanges) {
        console.log('[TransactionStore] No local changes, using server data');
        set({ transactions: serverTransactions });
        return;
      }
      
      // Merge: keep local changes (like cleanedAt) even if server doesn't have them yet
      const serverMap = new Map(serverTransactions.map(t => [t.id, t]));
      
      // First, identify orphaned transactions (exist only locally with cleanedAt)
      // These were marked cleaned locally but server never received them - treat as synced
      const merged: Transaction[] = [];
      
      currentTransactions.forEach(localTx => {
        const serverTx = serverMap.get(localTx.id);
        
        if (serverTx) {
          // Transaction exists on both - merge local changes with server data
          if (localTx.cleanedAt && !serverTx.cleanedAt) {
            console.log('[TransactionStore] Keeping local cleanedAt:', localTx.id, localTx.cleanedAt);
            merged.push(localTx);
          } else {
            merged.push(serverTx);
          }
        } else {
          // Transaction only exists locally - this is an orphan
          // If it has cleanedAt, assume it was synced to server and remove from local
          // If it has paidAt > 0 (valid paid transaction), keep it to sync later
          // If paidAt is 0, discard it (incomplete/failed transaction)
          if (localTx.cleanedAt) {
            console.log('[TransactionStore] Removing orphan transaction (cleaned locally):', localTx.id);
            // Don't add to merged - effectively removing it
          } else if (localTx.paidAt > 0) {
            console.log('[TransactionStore] Keeping unsynced paid transaction:', localTx.id, 'paidAt:', localTx.paidAt);
            merged.push(localTx);
          } else {
            // paidAt is 0 - incomplete transaction, discard
            console.log('[TransactionStore] Discarding incomplete transaction:', localTx.id);
          }
        }
      });
      
      // Add new transactions from server that aren't already in merged
      serverTransactions.forEach(serverTx => {
        if (!merged.find(t => t.id === serverTx.id)) {
          merged.push(serverTx);
        }
      });
      
      // Deduplicate by ID - keep first occurrence
      const seen = new Set<string>();
      const deduplicated = merged.filter(t => {
        if (seen.has(t.id)) {
          console.log('[TransactionStore] Deduplicated:', t.id);
          return false;
        }
        seen.add(t.id);
        return true;
      });
      
      if (deduplicated.length !== merged.length) {
        console.log('[TransactionStore] Deduplication removed', merged.length - deduplicated.length, 'duplicates');
      }
      
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
      return get().transactions.reduce((sum, t) => sum + t.totalPrice, 0);
    },
    
    getTodayRevenue: () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStart = today.getTime();
      
      return get().transactions
        .filter(t => t.paidAt >= todayStart)
        .reduce((sum, t) => sum + t.totalPrice, 0);
    },
  })
);

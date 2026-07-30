import { create } from 'zustand';
import type { Transaction } from '../types';

interface TransactionStore {
  transactions: Transaction[];
  isLoading: boolean;
  
  // Actions
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  removeTransaction: (id: string) => void;
  clearTransactions: () => void;
  setTransactions: (transactions: Transaction[]) => void;
  getTransactionsByRoom: (roomId: string) => Transaction[];
  getTransactionsByDateRange: (startDate: number, endDate: number) => Transaction[];
  getTotalRevenue: () => number;
  getTodayRevenue: () => number;
  setLoading: (loading: boolean) => void;
}

// Generate unique ID
const generateId = () => Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

export const useTransactionStore = create<TransactionStore>()(
  (set, get) => ({
    transactions: [],
    isLoading: false,
    
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
    
    clearTransactions: () => {
      set({ transactions: [] });
    },
    
    setTransactions: (transactions) => {
      set({ transactions });
    },
    
    setLoading: (loading) => {
      set({ isLoading: loading });
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

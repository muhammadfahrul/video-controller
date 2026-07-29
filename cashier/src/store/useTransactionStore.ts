import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Transaction } from '../types';

interface TransactionStore {
  transactions: Transaction[];
  
  // Actions
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  removeTransaction: (id: string) => void;
  clearTransactions: () => void;
  getTransactionsByRoom: (roomId: string) => Transaction[];
  getTransactionsByDateRange: (startDate: number, endDate: number) => Transaction[];
  getTotalRevenue: () => number;
  getTodayRevenue: () => number;
}

// Generate unique ID
const generateId = () => Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

export const useTransactionStore = create<TransactionStore>()(
  persist(
    (set, get) => ({
      transactions: [],
      
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
    }),
    {
      name: 'video-controller-transactions',
    }
  )
);

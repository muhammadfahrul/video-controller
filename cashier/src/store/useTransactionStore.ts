import { create } from 'zustand';
import type { Transaction } from '../types';
import type { LoadingMessage } from '../components/FullPageLoading';

interface TransactionStore {
    transactions: Transaction[];
    isLoading: boolean;
    loadingType: LoadingMessage;
    loadingMessage: string;

    // Actions
    addTransaction: (transaction: Omit<Transaction, 'id'> & { id?: string }) => void;
    updateTransaction: (id: string, updates: Partial<Transaction>) => void;
    removeTransaction: (id: string) => void;
    clearTransactions: () => void;
    clearTransactionsForRoom: (roomId: string, roomName: string) => void;
    setTransactionsForRoom: (roomId: string, transactions: Transaction[]) => void;
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
                id: transaction.id ?? generateId(),
            } as Transaction;

            set((state) => {
                // Cegah duplikasi jika ID transaksi sudah ada di state
                if (state.transactions.some(t => t.id === newTransaction.id)) {
                    return state;
                }
                return {
                    transactions: [newTransaction, ...state.transactions],
                };
            });
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

        clearTransactionsForRoom: (roomId, roomName) => {
            const roomKey = roomId.toLowerCase();
            const roomNameKey = roomName.toLowerCase();
            set((state) => ({
                transactions: state.transactions.filter(t =>
                    t.roomId.toLowerCase() !== roomKey && t.roomName.toLowerCase() !== roomNameKey
                ),
            }));
        },

        setTransactionsForRoom: (roomId, incomingTransactions) => {
            const roomKey = roomId.toLowerCase();
            set((state) => {
                // 1. Ambil transaksi dari ruangan LAIN
                const otherRoomTransactions = state.transactions.filter(
                    t => t.roomId.toLowerCase() !== roomKey
                );

                // 2. Buat Set dari ID transaksi baru yang masuk dari server
                const incomingIds = new Set(incomingTransactions.map(t => t.id));

                // 3. Cari transaksi lokal untuk room ini yang BELUM di-ack/save oleh server
                const pendingLocalTransactions = state.transactions.filter(
                    t => t.roomId.toLowerCase() === roomKey && !incomingIds.has(t.id)
                );

                // Merge: Incoming dari server + Transaksi lokal pending + Room lain
                return {
                    transactions: [
                        ...incomingTransactions,
                        ...pendingLocalTransactions,
                        ...otherRoomTransactions,
                    ],
                };
            });
        },

        setLoading: (loading, type = 'loading', message = '') => {
            set({ isLoading: loading, loadingType: type, loadingMessage: message });
        },

        getTransactionsByRoom: (roomId) => {
            const roomKey = roomId.toLowerCase();
            return get().transactions.filter(t => t.roomId.toLowerCase() === roomKey);
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
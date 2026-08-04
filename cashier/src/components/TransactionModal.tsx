import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTransactionStore } from '../store/useTransactionStore';
import { multiSocketService } from '../services/MultiSocketService';
import { PaymentConfirmModal } from './PaymentConfirmModal';
import { PrintReceipt } from './PrintReceipt';
import { Transaction } from '../types';
import { Receipt, X, Trash2, Search, Printer } from 'lucide-react';

interface TransactionModalProps {
  roomId: string;
  roomName: string;
  onClose: () => void;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(price);
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}j ${minutes}m`;
  return `${minutes}m`;
}

export function TransactionModal({ roomId, roomName, onClose }: TransactionModalProps) {
  const { 
    transactions: allTransactions,
    removeTransaction, 
    clearTransactions
  } = useTransactionStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today'>('all');
  const [showPaymentConfirm, setShowPaymentConfirm] = useState(false);
  const [printTransaction, setPrintTransaction] = useState<Transaction | null>(null);
  
  // Load transactions for this room
  useEffect(() => {
    // Request transactions from server for this room
    multiSocketService.loadTransactions(roomId);
  }, [roomId]);
  
  // Filter transactions by roomId OR roomName (case-insensitive) - client-side filtering from global store
  const roomKey = roomId.toLowerCase();
  const roomNameKey = roomName.toLowerCase();
  const transactions = allTransactions.filter(t => 
    t.roomId.toLowerCase() === roomKey || t.roomName.toLowerCase() === roomNameKey
  );
  
  // Filter transactions
  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = !searchTerm || 
      t.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.customerPhone?.includes(searchTerm);
    
    if (dateFilter === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStart = today.getTime();
      // Show unpaid (paidAt=0) or paid today
      return matchesSearch && (t.paidAt === 0 || t.paidAt >= todayStart);
    }
    
    return matchesSearch;
  });

  // Sort: unpaid first (paidAt=0), then by paidAt descending (newest first)
  filteredTransactions.sort((a, b) => {
    if (a.paidAt === 0 && b.paidAt !== 0) return -1;
    if (a.paidAt !== 0 && b.paidAt === 0) return 1;
    return b.paidAt - a.paidAt;
  });
  
  // Calculate revenue locally
  const calculateTotalRevenue = () => {
    return transactions.reduce((sum, t) => sum + t.totalPrice, 0);
  };
  
  const calculateTodayRevenue = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.getTime();
    return transactions
      .filter(t => t.paidAt >= todayStart)
      .reduce((sum, t) => sum + t.totalPrice, 0);
  };
  
  const totalRevenue = dateFilter === 'today' ? calculateTodayRevenue() : calculateTotalRevenue();

  // Get unpaid transactions for this room (paidAt === 0 means unpaid)
  const unpaidTransaction = filteredTransactions.find(t => t.paidAt === 0);

  // Handle payment - show confirmation modal for unpaid transaction
  const handlePayment = (transactionId?: string) => {
    const tx = transactionId ? filteredTransactions.find(t => t.id === transactionId) : unpaidTransaction;
    if (tx) {
      setShowPaymentConfirm(true);
    }
  };

  const handlePaymentConfirm = async (paymentMethod: 'cash' | 'transfer' | 'other', notes?: string) => {
    setShowPaymentConfirm(false);
    try {
      // Mark transaction as paid - find from filtered transactions
      const currentUnpaid = unpaidTransaction;
      if (currentUnpaid) {
        const updatedData: Transaction = {
          ...currentUnpaid,
          paymentMethod,
          notes,
          paidAt: Date.now()
        };
        // Update local store
        useTransactionStore.getState().updateTransaction(currentUnpaid.id, updatedData);
        // Send to server to persist
        multiSocketService.updateTransaction(updatedData);
      }
    } catch (error) {
      console.error('Payment error:', error);
    }
  };

  const handleDeleteTransaction = (transactionId: string) => {
    if (!confirm('Hapus transaksi ini?')) return;
    removeTransaction(transactionId);
    multiSocketService.deleteTransaction(transactionId);
  };
  
  const handleClearTransactions = () => {
    if (!confirm('Hapus semua riwayat transaksi?')) return;
    clearTransactions();
    multiSocketService.clearTransactions();
  };
  
  const modalContent = (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4" style={{ isolation: 'isolate' }}>
      <div className="bg-[#1a1a2e] rounded-xl w-full max-w-4xl max-h-[85vh] flex flex-col min-w-[600px] shadow-2xl" style={{ position: 'relative', zIndex: 10000 }}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-600/20 rounded-lg">
              <Receipt className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Riwayat Transaksi</h2>
              <p className="text-xs text-gray-500">{roomName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        

        
        {/* Stats */}
        <div className="px-4 py-3 border-b border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex gap-4">
              <div>
                <p className="text-[10px] text-gray-500 uppercase">Total Transaksi</p>
                <p className="text-sm font-semibold text-white">{transactions.length}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase">
                  {dateFilter === 'today' ? 'Hari Ini' : 'Total Pendapatan'}
                </p>
                <p className="text-sm font-semibold text-yellow-400">{formatPrice(totalRevenue)}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as 'all' | 'today')}
                className="bg-[#0f0f1a] border border-white/10 rounded px-2 py-1 text-xs text-white"
              >
                <option value="all">Semua</option>
                <option value="today">Hari Ini</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* Search */}
        <div className="px-4 py-2 border-b border-white/5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Cari nama atau nomor HP..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0f0f1a] border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>
        
        {/* Transaction List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Belum ada transaksi</p>
            </div>
          ) : (
            filteredTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="bg-[#0f0f1a] rounded-lg p-3 border border-white/5"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-white">
                        {transaction.customerName || 'Tamu'}
                      </span>
                      {transaction.customerPhone && (
                        <span className="text-xs text-gray-500">
                          {transaction.customerPhone}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{formatDuration(transaction.duration)}</span>
                      <span>•</span>
                      <span className={transaction.paidAt === 0 ? 'text-red-400' : ''}>
                        {transaction.paidAt === 0 ? 'Belum Lunas' : formatDate(transaction.paidAt)}
                      </span>
                    </div>
                    {transaction.customerNote && (
                      <p className="text-[10px] text-gray-500 mt-1">
                        Catatan: {transaction.customerNote}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-yellow-400">
                      {formatPrice(transaction.totalPrice)}
                    </p>
                      <div className="flex flex-col items-center gap-1 mt-1">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setPrintTransaction(transaction)}
                            className="p-1.5 text-blue-400 hover:bg-blue-500/20 rounded flex items-center justify-center"
                            title="Cetak Nota"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          {transaction.paidAt > 0 ? (
                            <button
                              onClick={() => handleDeleteTransaction(transaction.id)}
                              className="p-1.5 text-red-400 hover:bg-red-500/20 rounded flex items-center justify-center"
                              title="Hapus"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handlePayment(transaction.id)}
                              className="px-2.5 py-1 text-xs font-medium bg-yellow-600 hover:bg-yellow-500 text-white rounded"
                            >
                              Bayar
                            </button>
                          )}
                        </div>
                      </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        
        {/* Footer */}
        {transactions.length > 0 && (
          <div className="p-4 border-t border-white/10">
            <button
              onClick={handleClearTransactions}
              className="w-full py-2 text-sm text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
            >
              Hapus Semua Riwayat
            </button>
          </div>
        )}
      </div>

      {/* Payment Confirmation Modal */}
      {showPaymentConfirm && unpaidTransaction && (
        <PaymentConfirmModal
          roomName={roomName}
          customerName={unpaidTransaction.customerName}
          duration={unpaidTransaction.duration}
          totalPrice={unpaidTransaction.totalPrice}
          transaction={unpaidTransaction}
          onConfirm={handlePaymentConfirm}
          onCancel={() => setShowPaymentConfirm(false)}
        />
      )}

      {/* Print Receipt Modal */}
      {printTransaction && (
        <PrintReceipt
          transaction={printTransaction}
          onClose={() => setPrintTransaction(null)}
        />
      )}
    </div>
  );

  return createPortal(modalContent, document.body);
}

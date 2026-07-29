import { useState } from 'react';
import { useTransactionStore } from '../store/useTransactionStore';
import { Receipt, Search, Calendar, Trash2, Clock, User, Phone, Mail, FileText } from 'lucide-react';

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

export default function TransactionsPage() {
  const { transactions, removeTransaction, clearTransactions, getTotalRevenue, getTodayRevenue } = useTransactionStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today'>('all');
  
  // Filter transactions
  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = !searchTerm || 
      t.roomName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.customerPhone?.includes(searchTerm);
    
    if (dateFilter === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStart = today.getTime();
      return matchesSearch && t.paidAt >= todayStart;
    }
    
    return matchesSearch;
  });
  
  const totalRevenue = dateFilter === 'today' ? getTodayRevenue() : getTotalRevenue();
  
  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Receipt className="w-5 h-5 text-blue-400" />
          <h1 className="text-lg font-bold text-white">Riwayat Transaksi</h1>
        </div>
        
        {transactions.length > 0 && (
          <button 
            onClick={() => {
              if (confirm('Hapus semua riwayat transaksi?')) {
                clearTransactions();
              }
            }}
            className="flex items-center gap-1 px-2 py-1 text-xs text-red-400 hover:bg-red-500/20 rounded"
          >
            <Trash2 className="w-3 h-3" />
            Hapus Semua
          </button>
        )}
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#1a1a2e] rounded-lg p-3 border border-white/10">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-400">Total Pendapatan</span>
          </div>
          <p className="text-lg font-bold text-green-400">{formatPrice(totalRevenue)}</p>
          <p className="text-[10px] text-gray-500">{transactions.length} transaksi</p>
        </div>
        
        <div className="bg-[#1a1a2e] rounded-lg p-3 border border-white/10">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-400">Hari Ini</span>
          </div>
          <p className="text-lg font-bold text-yellow-400">{formatPrice(getTodayRevenue())}</p>
          <p className="text-[10px] text-gray-500">
            {transactions.filter(t => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              return t.paidAt >= today.getTime();
            }).length} transaksi
          </p>
        </div>
      </div>
      
      {/* Filters */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Cari ruangan atau pelanggan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-2 bg-[#1a1a2e] border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        
        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value as 'all' | 'today')}
          className="px-3 py-2 bg-[#1a1a2e] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
        >
          <option value="all">Semua</option>
          <option value="today">Hari Ini</option>
        </select>
      </div>
      
      {/* Transaction List */}
      <div className="space-y-2">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Receipt className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Tidak ada transaksi</p>
          </div>
        ) : (
          filteredTransactions.map(transaction => (
            <div
              key={transaction.id}
              className="bg-[#1a1a2e] rounded-lg p-3 border border-white/10"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-sm font-semibold text-white">{transaction.roomName}</h3>
                  <p className="text-[10px] text-gray-500">{formatDate(transaction.paidAt)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-green-400">{formatPrice(transaction.totalPrice)}</p>
                  <p className="text-[10px] text-gray-500">{formatDuration(transaction.duration)}</p>
                </div>
              </div>
              
              {/* Customer Info */}
              {(transaction.customerName || transaction.customerPhone || transaction.customerEmail || transaction.customerNote) && (
                <div className="pt-2 mt-2 border-t border-white/5 space-y-1">
                  {transaction.customerName && (
                    <p className="text-[10px] text-gray-400">
                      <User className="w-3 h-3 inline mr-1 text-purple-400" />
                      {transaction.customerName}
                    </p>
                  )}
                  {transaction.customerPhone && (
                    <p className="text-[10px] text-gray-400">
                      <Phone className="w-3 h-3 inline mr-1 text-purple-400" />
                      {transaction.customerPhone}
                    </p>
                  )}
                  {transaction.customerEmail && (
                    <p className="text-[10px] text-gray-400">
                      <Mail className="w-3 h-3 inline mr-1 text-purple-400" />
                      {transaction.customerEmail}
                    </p>
                  )}
                  {transaction.customerNote && (
                    <p className="text-[10px] text-gray-400">
                      <FileText className="w-3 h-3 inline mr-1 text-purple-400" />
                      {transaction.customerNote}
                    </p>
                  )}
                </div>
              )}
              
              {/* Delete button */}
              <button
                onClick={() => removeTransaction(transaction.id)}
                className="mt-2 w-full py-1 text-xs text-red-400 hover:bg-red-500/20 rounded flex items-center justify-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                Hapus
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

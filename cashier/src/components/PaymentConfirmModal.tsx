import { useState } from 'react';
import { createPortal } from 'react-dom';
import { CreditCard, Banknote, FileText, X, Check } from 'lucide-react';
import type { Transaction } from '../types';
import { PrintReceipt } from './PrintReceipt';

interface PaymentConfirmModalProps {
  roomName: string;
  customerName?: string;
  duration: number;
  totalPrice: number;
  transaction?: Transaction;
  onConfirm: (paymentMethod: 'cash' | 'transfer' | 'other', notes?: string) => void;
  onCancel: () => void;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(price);
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}j ${minutes}m`;
  return `${minutes}m`;
}

export function PaymentConfirmModal({ 
  roomName, 
  customerName, 
  duration, 
  totalPrice, 
  transaction,
  onConfirm, 
  onCancel 
}: PaymentConfirmModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'other'>('cash');
  const [notes, setNotes] = useState('');
  const [showPrintReceipt, setShowPrintReceipt] = useState(false);

  const handleConfirm = () => {
    onConfirm(paymentMethod, notes || undefined);
    // Show print receipt after confirmation if we have transaction data
    if (transaction) {
      setShowPrintReceipt(true);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]" style={{ isolation: 'isolate' }}>
      <div className="bg-[#1a1a2e] rounded-xl w-full max-w-md shadow-2xl" style={{ position: 'relative', zIndex: 10000 }}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-600/20 rounded-lg">
              <CreditCard className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Konfirmasi Pembayaran</h2>
              <p className="text-xs text-gray-500">{roomName}</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        
        {/* Payment Details */}
        <div className="p-4 border-b border-white/10 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">Pelanggan</span>
            <span className="text-white text-sm font-medium">{customerName || 'Tamu'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">Durasi</span>
            <span className="text-white text-sm">{formatDuration(duration)}</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-white/10">
            <span className="text-gray-400 text-sm">Total Pembayaran</span>
            <span className="text-xl font-bold text-yellow-400">{formatPrice(totalPrice)}</span>
          </div>
        </div>
        
        {/* Payment Method Selection */}
        <div className="p-4 border-b border-white/10">
          <p className="text-gray-400 text-sm mb-3">Metode Pembayaran</p>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setPaymentMethod('cash')}
              className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-all ${
                paymentMethod === 'cash' 
                  ? 'border-green-500 bg-green-500/20 text-green-400' 
                  : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20'
              }`}
            >
              <Banknote className="w-5 h-5" />
              <span className="text-xs">Tunai</span>
            </button>
            <button
              onClick={() => setPaymentMethod('transfer')}
              className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-all ${
                paymentMethod === 'transfer' 
                  ? 'border-green-500 bg-green-500/20 text-green-400' 
                  : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20'
              }`}
            >
              <CreditCard className="w-5 h-5" />
              <span className="text-xs">Transfer</span>
            </button>
            <button
              onClick={() => setPaymentMethod('other')}
              className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-all ${
                paymentMethod === 'other' 
                  ? 'border-green-500 bg-green-500/20 text-green-400' 
                  : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20'
              }`}
            >
              <FileText className="w-5 h-5" />
              <span className="text-xs">Lainnya</span>
            </button>
          </div>
        </div>
        
        {/* Notes */}
        <div className="p-4 border-b border-white/10">
          <p className="text-gray-400 text-sm mb-2">Catatan (opsional)</p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Tambahkan catatan..."
            className="w-full bg-[#0f0f1a] border border-white/10 rounded-lg p-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500 resize-none"
            rows={2}
          />
        </div>
        
        {/* Actions */}
        <div className="p-4 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 text-sm text-gray-400 hover:bg-white/5 rounded-lg transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-2.5 text-sm font-medium bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            Konfirmasi
          </button>
        </div>
      </div>

      {/* Print Receipt Modal - shown after payment */}
      {showPrintReceipt && transaction && (
        <PrintReceipt
          transaction={transaction}
          onClose={() => {
            setShowPrintReceipt(false);
            onCancel();
          }}
        />
      )}
    </div>
  );

  return createPortal(modalContent, document.body);
}

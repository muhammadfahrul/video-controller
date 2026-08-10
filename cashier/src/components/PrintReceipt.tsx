import { createPortal } from 'react-dom';
import { Transaction } from '../types';
import { Printer, X } from 'lucide-react';

interface PrintReceiptProps {
  transaction: Transaction;
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
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}j ${minutes}m`;
  }
  return `${minutes}m ${secs}d`;
}

const BUSINESS_NAME = 'KARAOKE';
const BUSINESS_ADDRESS = 'Jl. Contoh No. 123';
const BUSINESS_PHONE = 'Telp: 0812-3456-7890';

export function PrintReceipt({ transaction, onClose }: PrintReceiptProps) {
  const handlePrint = () => {
    const isPaid = transaction.paidAt > 0;
    
    const printWindow = window.open('', '_blank', 'width=350,height=500');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Nota - ${transaction.roomName}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Courier New', monospace;
              font-size: 11px;
              line-height: 1.3;
              padding: 5mm;
              width: 58mm;
              margin: 0 auto;
            }
            .header { text-align: center; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px dashed #333; }
            .title { font-size: 14px; font-weight: bold; }
            .addr { font-size: 9px; margin-top: 2px; }
            .row { display: flex; justify-content: space-between; margin: 3px 0; }
            .lbl { color: #555; }
            .div { border-bottom: 1px dashed #333; margin: 8px 0; }
            .tot { text-align: center; margin: 10px 0; padding: 8px; border: 2px solid #000; }
            .tot-lbl { font-size: 10px; margin-bottom: 2px; }
            .tot-prc { font-size: 16px; font-weight: bold; }
            .ftr { text-align: center; margin-top: 15px; padding-top: 8px; border-top: 1px dashed #333; font-size: 9px; color: #555; }
            .stat { text-align: center; font-weight: bold; margin-top: 8px; }
            @media print { body { width: 58mm !important; padding: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">${BUSINESS_NAME}</div>
            <div class="addr">${BUSINESS_ADDRESS}</div>
            <div class="addr">${BUSINESS_PHONE}</div>
          </div>
          <div class="row"><span class="lbl">No</span><span>${transaction.id.slice(-6).toUpperCase()}</span></div>
          <div class="row"><span class="lbl">Ruang</span><span>${transaction.roomName}</span></div>
          <div class="row"><span class="lbl">Tgl</span><span>${formatDate(transaction.startTime)}</span></div>
          <div class="div"></div>
          <div class="row"><span class="lbl">Masuk</span><span>${formatTime(transaction.startTime)}</span></div>
          <div class="row"><span class="lbl">Keluar</span><span>${formatTime(transaction.endTime)}</span></div>
          <div class="row"><span class="lbl">Durasi</span><span>${formatDuration(transaction.duration)}</span></div>
          <div class="div"></div>
          <div class="row"><span class="lbl">Tarif</span><span>${formatPrice(transaction.pricePerHour)}/jam</span></div>
          <div class="tot"><div class="tot-lbl">TOTAL BAYAR</div><div class="tot-prc">${formatPrice(transaction.totalPrice)}</div></div>
          ${transaction.customerName ? `<div class="row"><span class="lbl">Pelanggan</span><span>${transaction.customerName}</span></div>` : ''}
          ${transaction.customerPhone ? `<div class="row"><span class="lbl">HP</span><span>${transaction.customerPhone}</span></div>` : ''}
          <div class="div"></div>
          <div class="row"><span class="lbl">Status</span><span>${isPaid ? 'LUNAS' : 'BELUM LUNAS'}</span></div>
          ${isPaid && transaction.paymentMethod ? `<div class="row"><span class="lbl">Cara Bayar</span><span>${transaction.paymentMethod}</span></div>` : ''}
          <div class="ftr"><div>Terima Kasih</div><div>Selamat Bersenang-senang</div></div>
        </body>
      </html>
    `);
    printWindow.document.close();
    
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
  };

  const isPaid = transaction.paidAt > 0;

  const modalContent = (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999]" style={{ isolation: 'isolate' }}>
      <div className="bg-white rounded-lg w-[380px] max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 flex items-center justify-between">
          <h2 className="text-white font-semibold text-lg">Preview Nota</h2>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Receipt Preview */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          <div 
            id="receipt-content"
            className="bg-white border-2 border-gray-800 p-3 mx-auto text-xs font-mono"
            style={{ width: '58mm', fontFamily: "'Courier New', monospace" }}
          >
            {/* Header */}
            <div className="text-center border-b border-dashed border-gray-400 pb-3 mb-3">
              <div className="text-sm font-bold">{BUSINESS_NAME}</div>
              <div className="text-[9px] mt-0.5">{BUSINESS_ADDRESS}</div>
              <div className="text-[9px]">{BUSINESS_PHONE}</div>
            </div>

            {/* Transaction Info */}
            <div className="mb-2">
              <div className="flex justify-between">
                <span className="text-gray-500">No</span>
                <span className="font-medium">{transaction.id.slice(-6).toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Ruang</span>
                <span className="font-medium">{transaction.roomName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Tgl</span>
                <span className="font-medium">{formatDate(transaction.startTime)}</span>
              </div>
            </div>

            <div className="border-b border-dashed border-gray-400 my-2"></div>

            {/* Duration */}
            <div className="mb-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Masuk</span>
                <span className="font-medium">{formatTime(transaction.startTime)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Keluar</span>
                <span className="font-medium">{formatTime(transaction.endTime)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Durasi</span>
                <span className="font-medium">{formatDuration(transaction.duration)}</span>
              </div>
            </div>

            <div className="border-b border-dashed border-gray-400 my-2"></div>

            {/* Price */}
            <div className="mb-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Tarif</span>
                <span>{formatPrice(transaction.pricePerHour)}/jam</span>
              </div>
            </div>

            {/* Total */}
            <div className="text-center border-2 border-gray-800 p-2 my-3">
              <div className="text-gray-500 text-[9px] mb-0.5">TOTAL BAYAR</div>
              <div className="text-lg font-bold">{formatPrice(transaction.totalPrice)}</div>
            </div>

            {/* Customer Info */}
            {(transaction.customerName || transaction.customerPhone) && (
              <div className="mb-2">
                {transaction.customerName && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Pelanggan</span>
                    <span>{transaction.customerName}</span>
                  </div>
                )}
                {transaction.customerPhone && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">HP</span>
                    <span>{transaction.customerPhone}</span>
                  </div>
                )}
              </div>
            )}

            <div className="border-b border-dashed border-gray-400 my-2"></div>

            {/* Payment Info */}
            <div className="mb-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <span className={`font-bold ${isPaid ? 'text-green-600' : 'text-red-600'}`}>
                  {isPaid ? 'LUNAS' : 'BELUM LUNAS'}
                </span>
              </div>
              {isPaid && transaction.paymentMethod && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Cara Bayar</span>
                  <span className="capitalize">{transaction.paymentMethod}</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="text-center text-gray-400 text-[9px] mt-4 pt-2 border-t border-dashed border-gray-400">
              <p>Terima Kasih</p>
              <p>Selamat Bersenang-senang</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t bg-gray-50 flex gap-3">
          <button
            onClick={handlePrint}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-4 rounded-lg font-medium flex items-center justify-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Cetak
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2.5 px-4 rounded-lg font-medium"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

import { useEffect, useState, useMemo } from 'react';
import type { RoomBilling } from '../types';
import { multiSocketService } from '../services/MultiSocketService';
import { billingConfig } from '../config/billing';
import { useRoomStore } from '../store/useRoomStore';
import { useTransactionStore } from '../store/useTransactionStore';
import type { LoadingMessage } from '../components/FullPageLoading';
import { TransactionModal } from './TransactionModal';
import { PaymentConfirmModal } from './PaymentConfirmModal';
import { MoveRoomModal } from './MoveRoomModal';
import { getRoomStatus } from '../utils/roomStatus';
import { Clock, Wallet, Disc3, Power, PowerOff, Timer, User, Phone, Mail, FileText, Receipt, ArrowRightLeft } from 'lucide-react';

interface RoomCardProps {
  roomBilling: RoomBilling;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(price);
}

export function RoomCard({ roomBilling }: RoomCardProps) {
  const [durationInput, setDurationInput] = useState('');
  const [extendTimeInput, setExtendTimeInput] = useState('');
  const [customerNameInput, setCustomerNameInput] = useState('');
  const [customerPhoneInput, setCustomerPhoneInput] = useState('');
  const [customerEmailInput, setCustomerEmailInput] = useState('');
  const [customerNoteInput, setCustomerNoteInput] = useState('');
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showPaymentConfirm, setShowPaymentConfirm] = useState(false);
  const [showMoveRoom, setShowMoveRoom] = useState(false);
  const [pendingDeactivation, setPendingDeactivation] = useState<{
    roomId: string;
    customerName?: string;
    duration: number;
    totalPrice: number;
  } | null>(null);
  const setGlobalLoading = useRoomStore((state) => state.setLoading);
  const isLoading = useRoomStore((state) => state.isLoading);
  
  // Countdown timer for expiry
  const [countdown, setCountdown] = useState<number | null>(null);
  const [showExpiredConfirm, setShowExpiredConfirm] = useState(false);
  
  // Memoized billing calculation - total cost for full duration
  const { totalSeconds, isTimerBased } = useMemo(() => {
    if (roomBilling.expiresAt && roomBilling.startTime) {
      const totalTimerSeconds = (roomBilling.expiresAt - roomBilling.startTime) / 1000; // convert ms to seconds
      return { totalSeconds: totalTimerSeconds, isTimerBased: true };
    }
    return { totalSeconds: 0, isTimerBased: false };
  }, [roomBilling.expiresAt, roomBilling.startTime]);
  
  useEffect(() => {
    if (roomBilling.expiresAt) {
      const updateCountdown = () => {
        const remaining = Math.max(0, Math.floor((roomBilling.expiresAt! - Date.now()) / 1000));
        setCountdown(remaining);
        
        // Auto-deactivate when time expires
        if (remaining === 0 && roomBilling.isActive) {
          // Automatically deactivate when time expires - creates transaction
          multiSocketService.deactivateRoom(roomBilling.roomId, undefined, undefined, () => {});
        }
      };
      
      updateCountdown();
      const interval = setInterval(updateCountdown, 1000);
      return () => clearInterval(interval);
    } else {
      setCountdown(null);
    }
  }, [roomBilling.expiresAt, roomBilling.isActive]);

  // Clear customer input fields when room is deactivated
  useEffect(() => {
    if (!roomBilling.isActive && (customerNameInput || customerPhoneInput || customerEmailInput || customerNoteInput)) {
      setCustomerNameInput('');
      setCustomerPhoneInput('');
      setCustomerEmailInput('');
      setCustomerNoteInput('');
    }
  }, [roomBilling.isActive]);
  
  const handleToggleActive = async () => {
    const loadingType: LoadingMessage = roomBilling.isActive ? 'deactivating' : 'activating';
    
    // Check if there's unpaid transaction for this room (paidAt === 0 means unpaid) - prevent activation if exists
    const allTransactions = useTransactionStore.getState().transactions;
    // Debug: log transactions for this room
    console.log('[RoomCard] All transactions:', allTransactions);
    console.log('[RoomCard] Checking room:', roomBilling.roomId, roomBilling.roomName);
    // Match by roomId OR roomName (case-insensitive)
    const roomKey = roomBilling.roomId.toLowerCase();
    const roomNameKey = roomBilling.roomName.toLowerCase();
    const roomTransactions = allTransactions.filter(t => 
      t.roomId.toLowerCase() === roomKey || t.roomName.toLowerCase() === roomNameKey
    );
    console.log('[RoomCard] Room transactions:', roomTransactions);
    const unpaidTx = roomTransactions.find(t => t.paidAt === 0);
    console.log('[RoomCard] Unpaid transaction:', unpaidTx);
    if (!roomBilling.isActive && unpaidTx) {
      alert(`Tidak dapat mengaktifkan ruangan. Ada transaksi belum lunas: ${formatPrice(unpaidTx.totalPrice)}\nSilakan lunasi terlebih dahulu di Riwayat Transaksi.`);
      setShowTransactionModal(true);
      return;
    }
    
    // Prevent activation if room is in BERSIHKAN status (needs cleaning first)
    if (!roomBilling.isActive && roomStatus.label === 'BERSIHKAN') {
      alert('Tidak dapat mengaktifkan ruangan. Ruangan masih dalam proses pembersihan.\nSilakan tunggu hingga status berubah menjadi SUDAH DIBERSIHKAN.');
      return;
    }
    
    if (roomBilling.isActive) {
      // Deactivate room - will create transaction automatically
      setGlobalLoading(true, 'deactivating');
      try {
        await multiSocketService.deactivateRoom(roomBilling.roomId, undefined, undefined, () => {
          setGlobalLoading(false);
        });
      } catch (error) {
        setGlobalLoading(false);
      }
      return;
    }
    
    setGlobalLoading(true, loadingType);
    try {
      const minutes = durationInput ? parseInt(durationInput, 10) : undefined;
      const customerName = customerNameInput.trim() || undefined;
      const customerPhone = customerPhoneInput.trim() || undefined;
      const customerEmail = customerEmailInput.trim() || undefined;
      const customerNote = customerNoteInput.trim() || undefined;
      
      if (minutes && minutes > 0) {
        await multiSocketService.activateRoom(roomBilling.roomId, roomBilling.roomName, minutes, customerName, customerPhone, customerEmail, customerNote, () => {
          setGlobalLoading(false);
        });
      } else {
        await multiSocketService.activateRoom(roomBilling.roomId, roomBilling.roomName, undefined, customerName, customerPhone, customerEmail, customerNote, () => {
          setGlobalLoading(false);
        });
      }
      setDurationInput('');
    } catch (error) {
      setGlobalLoading(false);
    }
  };
  
  const handleExtendTime = async () => {
    const minutes = extendTimeInput ? parseInt(extendTimeInput, 10) : undefined;
    if (!minutes || minutes <= 0) {
      return;
    }
    setGlobalLoading(true, 'extending');
    try {
      await multiSocketService.extendTime(roomBilling.roomId, minutes, () => {
        setGlobalLoading(false);
      });
      setExtendTimeInput('');
    } catch (error) {
      setGlobalLoading(false);
    }
  };

  // Perform the actual deactivation
  const performDeactivation = async (paymentMethod: 'cash' | 'transfer' | 'other', _notes?: string) => {
    setShowPaymentConfirm(false);
    setGlobalLoading(true, 'deactivating');
    try {
      await multiSocketService.deactivateRoom(
        roomBilling.roomId,
        paymentMethod,
        'manual',
        () => {
          setGlobalLoading(false);
        }
      );
      setDurationInput('');
      setCustomerNameInput('');
      setCustomerPhoneInput('');
      setCustomerEmailInput('');
      setCustomerNoteInput('');
    } catch (error) {
      setGlobalLoading(false);
    }
  };

  // Handle payment confirmation
  const handlePaymentConfirm = (paymentMethod: 'cash' | 'transfer' | 'other', notes?: string) => {
    if (pendingDeactivation) {
      performDeactivation(paymentMethod, notes);
      setPendingDeactivation(null);
    }
  };
  
  // Format countdown to MM:SS or HH:MM:SS
  const formatCountdown = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };
  
  const isExpiringSoon = countdown !== null && countdown <= 60;
  const isWarning = countdown !== null && countdown <= 300;
  
  // Get price from room config store
  const roomConfigs = useRoomStore((state) => state.roomConfigs);
  const roomConfig = roomConfigs.find(r => r.name === roomBilling.roomName);
  const pricePerHour = roomConfig?.pricePerHour ?? roomBilling.pricePerHour ?? 50000;
  // Per-block/jam: minimum 1 jam, lalu dibulatkan ke atas
  const currentPrice = Math.ceil(totalSeconds / 3600) * pricePerHour;
  
  const isLocked = billingConfig.enabled ? !roomBilling.isConnected : false;
  const status = roomBilling.status;
  
  // Check for unpaid transactions and needs cleaning - use hook for reactivity
  const allTransactions = useTransactionStore((state) => state.transactions);
  const roomKey = roomBilling.roomId.toLowerCase();
  const roomNameKey = roomBilling.roomName.toLowerCase();
  const roomTransactions = allTransactions.filter(t => 
    t.roomId.toLowerCase() === roomKey || t.roomName.toLowerCase() === roomNameKey
  );
  const latestTransaction = roomTransactions[0]; // Most recent transaction (added to front)
  const hasUnpaid = roomTransactions.some(t => t.paidAt === 0);

  const roomStatus = getRoomStatus(roomBilling, allTransactions);
  const borderColor = roomStatus.borderColor;
  const iconColor = roomStatus.iconColor;
  const badgeColor = roomStatus.badgeColor;
  const badgeText = roomStatus.label;
  
  return (
    <div className={`bg-[#1a1a2e] rounded-lg border-l-4 flex flex-col ${borderColor} ${isLocked ? 'opacity-60' : ''} hover:brightness-110 transition-all`}>
      {/* Header - Row 1: Icon + Name + Button */}
      <div className="p-3 pb-2 flex items-center justify-between">
        {/* Left: Icon + Name - aligned center */}
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 flex items-center justify-center rounded ${iconColor}`}>
            <Disc3 className={`w-4 h-4 ${status === 'playing' ? 'animate-spin' : ''}`} />
          </div>
          <h3 className="text-sm font-semibold text-white">{roomBilling.roomName}</h3>
        </div>
        
        {/* Right: Buttons */}
        <div className="flex items-center gap-1">
          {/* Transaction History Button */}
          {billingConfig.enabled && roomBilling.isConnected && (
            <button 
              onClick={() => setShowTransactionModal(true)}
              className="w-6 h-6 flex items-center justify-center rounded bg-purple-500/20 text-purple-400 hover:bg-purple-500/30"
              title="Riwayat Transaksi"
            >
              <Receipt className="w-3.5 h-3.5" />
            </button>
          )}
          
          {/* Power Button */}
          {billingConfig.enabled && roomBilling.isConnected && (
            <button 
              onClick={handleToggleActive} 
              disabled={isLoading || (!roomBilling.isActive && (hasUnpaid || roomStatus.label === 'BERSIHKAN'))}
              className={`w-6 h-6 flex items-center justify-center rounded ${roomBilling.isActive ? 'bg-red-500/20 text-red-400' : hasUnpaid ? 'bg-orange-500/20 text-orange-400' : roomStatus.label === 'BERSIHKAN' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'} ${isLoading || (!roomBilling.isActive && (hasUnpaid || roomStatus.label === 'BERSIHKAN')) ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={!roomBilling.isActive && hasUnpaid ? 'Ada transaksi belum lunas' : !roomBilling.isActive && roomStatus.label === 'BERSIHKAN' ? 'Ruangan dalam proses pembersihan' : roomBilling.isActive ? 'Matikan' : 'Nyalakan'}
            >
              {roomBilling.isActive ? (
                <PowerOff className="w-3.5 h-3.5" />
              ) : hasUnpaid ? (
                <span className="text-xs">!</span>
              ) : roomStatus.label === 'BERSIHKAN' ? (
                <span className="text-xs">🧹</span>
              ) : (
                <Power className="w-3.5 h-3.5" />
              )}
            </button>
          )}
          
          {/* Move Room Button - only show when active */}
          {billingConfig.enabled && roomBilling.isActive && (
            <button 
              onClick={() => setShowMoveRoom(true)}
              className="w-6 h-6 flex items-center justify-center rounded bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
              title="Pindahkan ke ruangan lain"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
      
      {/* Header - Row 2 */}
      <div className="px-3 pb-2 flex items-center justify-between">
        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${badgeColor}`}>
          {badgeText}
        </span>
        {isTimerBased && roomBilling.isActive && (
          <div className="text-right">
            <p className="text-[9px] text-gray-500 uppercase">Tagihan</p>
            <p className="text-sm font-bold text-yellow-400">{formatPrice(currentPrice)}</p>
          </div>
        )}
        {!isTimerBased && !roomBilling.isActive && hasUnpaid && latestTransaction && (
          <div className="text-right">
            <p className="text-[9px] text-gray-500 uppercase">Tertunda</p>
            <p className="text-sm font-bold text-orange-400">{formatPrice(latestTransaction.totalPrice)}</p>
          </div>
        )}
      </div>
      
      {/* Locked Message */}
      {isLocked && (
        <div className="px-3 pb-3">
          <div className="py-2 px-3 bg-red-500/10 rounded border border-red-500/20 text-center">
            <p className="text-[10px] text-red-400">Ruangan tidak terhubung</p>
          </div>
        </div>
      )}

      {/* Room-level cleaning (from Move Room) - no transaction to mark cleaned from */}
      {!isLocked && !roomBilling.isActive && roomBilling.needsCleaning && (
        <div className="px-3 pb-3">
          <div className="py-2 px-3 bg-yellow-500/10 rounded border border-yellow-500/20 flex items-center justify-between gap-2">
            <p className="text-[10px] text-yellow-400">Ruangan ditinggalkan (pindah), perlu dibersihkan</p>
            <button
              onClick={() => multiSocketService.markRoomCleaned(roomBilling.roomId)}
              className="shrink-0 px-2 py-1 rounded bg-yellow-500/20 text-yellow-300 text-[10px] font-medium hover:bg-yellow-500/30"
            >
              Sudah Dibersihkan
            </button>
          </div>
        </div>
      )}
      
      {/* Info Rows */}
      {!isLocked && roomBilling.isActive && (
        <div className="px-3 pb-3 space-y-1">
          {isTimerBased && countdown !== null && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Clock className={`w-3.5 h-3.5 ${isExpiringSoon ? 'text-red-400' : isWarning ? 'text-yellow-400' : 'text-orange-400'}`} />
                <span className="text-[10px] text-gray-400">Sisa:</span>
              </div>
              <span className={`text-xs font-semibold ${isExpiringSoon ? 'text-red-400' : isWarning ? 'text-yellow-400' : 'text-orange-400'}`}>
                {formatCountdown(countdown)}
              </span>
            </div>
          )}
          {isTimerBased && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-pink-400" />
                <span className="text-[10px] text-gray-400">Tarif:</span>
              </div>
              <span className="text-xs font-semibold text-white">{formatPrice(pricePerHour)}/jam</span>
            </div>
          )}
        </div>
      )}
      
      {/* Start Time & Customer Info */}
      {(roomBilling.startTime || roomBilling.customerName || roomBilling.customerPhone || roomBilling.customerEmail || roomBilling.customerNote) && !isLocked && roomBilling.isActive && (
        <div className="px-3 pb-2 mt-auto border-t border-white/5 space-y-1">
          {roomBilling.customerName && (
            <p className="text-[9px] text-gray-500">
              <span className="text-purple-400">Pelanggan:</span> {roomBilling.customerName}
            </p>
          )}
          {roomBilling.customerPhone && (
            <p className="text-[9px] text-gray-500">
              <span className="text-purple-400">HP:</span> {roomBilling.customerPhone}
            </p>
          )}
          {roomBilling.customerEmail && (
            <p className="text-[9px] text-gray-500">
              <span className="text-purple-400">Email:</span> {roomBilling.customerEmail}
            </p>
          )}
          {roomBilling.customerNote && (
            <p className="text-[9px] text-gray-500">
              <span className="text-purple-400">Catatan:</span> {roomBilling.customerNote}
            </p>
          )}
          {roomBilling.startTime && (
            <p className="text-[9px] text-gray-500">
              <span className="text-purple-400">Mulai:</span> {new Date(roomBilling.startTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
      )}
      
      {/* Extend Time (only when active) */}
      {roomBilling.isActive && !isLocked && billingConfig.enabled && (
        <div className="px-3 pb-2 space-y-2 border-t border-white/5">
          <p className="text-[10px] text-gray-500 font-medium">Tambah Waktu</p>
          <div className="flex items-center gap-2">
            <Timer className="w-3.5 h-3.5 text-green-400 shrink-0" />
            <input
              type="number"
              min="1"
              max="480"
              placeholder="Menit"
              value={extendTimeInput}
              onChange={(e) => setExtendTimeInput(e.target.value)}
              className="w-20 bg-[#0f0f1a] border border-white/10 rounded px-2 py-1 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-green-500"
            />
            <button
              onClick={handleExtendTime}
              disabled={!extendTimeInput || parseInt(extendTimeInput, 10) <= 0 || isLoading}
              className="px-2 py-1 bg-green-500/20 text-green-400 text-[10px] font-medium rounded hover:bg-green-500/30 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
            >
              Tambah
            </button>
          </div>
        </div>
      )}
      
      {/* Duration Input (only when not active and connected) */}
      {!roomBilling.isActive && !isLocked && billingConfig.enabled && (
        <div className="px-3 pb-2 space-y-2">
          {/* Customer Name Input */}
          <div className="flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <input
              type="text"
              placeholder="Nama"
              value={customerNameInput}
              onChange={(e) => setCustomerNameInput(e.target.value)}
              className="flex-1 bg-[#0f0f1a] border border-white/10 rounded px-2 py-1 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-purple-500"
            />
          </div>
          
          {/* Customer Phone Input */}
          <div className="flex items-center gap-2">
            <Phone className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <input
              type="tel"
              placeholder="No. HP"
              value={customerPhoneInput}
              onChange={(e) => setCustomerPhoneInput(e.target.value)}
              className="flex-1 bg-[#0f0f1a] border border-white/10 rounded px-2 py-1 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-purple-500"
            />
          </div>
          
          {/* Customer Email Input */}
          <div className="flex items-center gap-2">
            <Mail className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <input
              type="email"
              placeholder="Email"
              value={customerEmailInput}
              onChange={(e) => setCustomerEmailInput(e.target.value)}
              className="flex-1 bg-[#0f0f1a] border border-white/10 rounded px-2 py-1 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-purple-500"
            />
          </div>
          
          {/* Customer Note Input */}
          <div className="flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <input
              type="text"
              placeholder="Catatan"
              value={customerNoteInput}
              onChange={(e) => setCustomerNoteInput(e.target.value)}
              className="flex-1 bg-[#0f0f1a] border border-white/10 rounded px-2 py-1 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-purple-500"
            />
          </div>
          
          {/* Duration Input */}
          <div className="flex items-center gap-2">
            <Timer className="w-3.5 h-3.5 text-orange-400 shrink-0" />
            <input
              type="number"
              min="1"
              max="480"
              placeholder="Menit"
              value={durationInput}
              onChange={(e) => setDurationInput(e.target.value)}
              className="w-20 bg-[#0f0f1a] border border-white/10 rounded px-2 py-1 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-orange-500"
            />
            <span className="text-[10px] text-gray-500">(menit)</span>
          </div>
        </div>
      )}
      
      {/* Transaction Modal */}
      {showTransactionModal && (
        <TransactionModal
          roomId={roomBilling.roomId}
          roomName={roomBilling.roomName}
          onClose={() => setShowTransactionModal(false)}
        />
      )}

      {/* Payment Confirmation Modal */}
      {showPaymentConfirm && pendingDeactivation && (
        <PaymentConfirmModal
          roomName={roomBilling.roomName}
          customerName={pendingDeactivation.customerName}
          duration={pendingDeactivation.duration}
          totalPrice={pendingDeactivation.totalPrice}
          onConfirm={handlePaymentConfirm}
          onCancel={() => {
            setShowPaymentConfirm(false);
            setPendingDeactivation(null);
            setGlobalLoading(false);
          }}
        />
      )}

      {/* Move Room Modal */}
      {showMoveRoom && (
        <MoveRoomModal
          roomBilling={roomBilling}
          onClose={() => setShowMoveRoom(false)}
          onMoveComplete={() => setShowMoveRoom(false)}
        />
      )}

      {/* Expired Time Confirmation Modal */}
      {showExpiredConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-9999">
          <div className="bg-[#1a1a2e] rounded-xl p-6 w-full max-w-md shadow-2xl border border-red-500/30">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Timer className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Waktu Habis!</h3>
              <p className="text-gray-400 mb-6">
                Waktu ruangan {roomBilling.roomName} telah habis. Apakah ingin memperpanjang atau mengakhiri sesi?
              </p>
              
              <div className="space-y-3">
                <button
                  onClick={async () => {
                    setShowExpiredConfirm(false);
                    // Extend by 1 hour default
                    setGlobalLoading(true, 'extending');
                    try {
                      await multiSocketService.extendTime(roomBilling.roomId, 60, () => {
                        setGlobalLoading(false);
                      });
                    } catch (error) {
                      setGlobalLoading(false);
                    }
                  }}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
                >
                  Perpanjang 1 Jam
                </button>
                <button
                  onClick={async () => {
                    setShowExpiredConfirm(false);
                    // Deactivate room - this will create transaction automatically
                    setGlobalLoading(true, 'deactivating');
                    try {
                      await multiSocketService.deactivateRoom(roomBilling.roomId, undefined, undefined, () => {
                        setGlobalLoading(false);
                      });
                    } catch (error) {
                      setGlobalLoading(false);
                    }
                  }}
                  className="w-full py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition-colors"
                >
                  Akhiri Sesi (Buat Transaksi)
                </button>
                <button
                  onClick={() => setShowExpiredConfirm(false)}
                  className="w-full py-2 text-gray-400 hover:text-white text-sm transition-colors"
                >
                  Nanti Saja
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

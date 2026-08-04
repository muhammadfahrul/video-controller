import { useEffect, useState, useMemo } from 'react';
import type { RoomBilling } from '../types';
import { multiSocketService } from '../services/MultiSocketService';
import { billingConfig } from '../config/billing';
import { useRoomStore } from '../store/useRoomStore';
import type { LoadingMessage } from '../components/FullPageLoading';
import { TransactionModal } from './TransactionModal';
import { Clock, Wallet, Disc3, Power, PowerOff, Timer, User, Phone, Mail, FileText, Receipt } from 'lucide-react';

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
  const setGlobalLoading = useRoomStore((state) => state.setLoading);
  const isLoading = useRoomStore((state) => state.isLoading);
  
  // Countdown timer for expiry
  const [countdown, setCountdown] = useState<number | null>(null);
  
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
      };
      
      updateCountdown();
      const interval = setInterval(updateCountdown, 1000);
      return () => clearInterval(interval);
    } else {
      setCountdown(null);
    }
  }, [roomBilling.expiresAt]);
  
  const handleToggleActive = async () => {
    const loadingType: LoadingMessage = roomBilling.isActive ? 'deactivating' : 'activating';
    setGlobalLoading(true, loadingType);
    try {
      if (roomBilling.isActive) {
        await multiSocketService.deactivateRoom(roomBilling.roomId, () => {
          setGlobalLoading(false);
        });
        setDurationInput('');
        setCustomerNameInput('');
        setCustomerPhoneInput('');
        setCustomerEmailInput('');
        setCustomerNoteInput('');
      } else {
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
      }
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
  const pricePerHour = roomConfig?.pricePerHour || roomBilling.pricePerHour || 50000;
  // Per-block/jam: minimum 1 jam, lalu dibulatkan ke atas
  const currentPrice = Math.ceil(totalSeconds / 3600) * pricePerHour;
  
  const isLocked = billingConfig.enabled ? !roomBilling.isConnected : false;
  const status = roomBilling.status;
  
  const borderColor = !roomBilling.isConnected ? 'border-l-red-500' : roomBilling.isActive ? 'border-l-blue-500' : 'border-l-gray-500';
  const iconColor = !roomBilling.isConnected ? 'text-red-400 bg-red-500/20' : roomBilling.isActive ? 'text-blue-400 bg-blue-500/20' : 'text-gray-400 bg-gray-500/20';
  const badgeColor = !roomBilling.isConnected ? 'bg-red-500/20 text-red-400' : roomBilling.isActive ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-400';
  const badgeText = !roomBilling.isConnected ? 'OFFLINE' : roomBilling.isActive ? 'AKTIF' : 'ONLINE';
  
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
          <button 
            onClick={() => setShowTransactionModal(true)}
            className="w-6 h-6 flex items-center justify-center rounded bg-purple-500/20 text-purple-400 hover:bg-purple-500/30"
            title="Riwayat Transaksi"
          >
            <Receipt className="w-3.5 h-3.5" />
          </button>
          
          {/* Power Button */}
          {billingConfig.enabled && roomBilling.isConnected && (
            <button 
              onClick={handleToggleActive} 
              disabled={isLoading}
              className={`w-6 h-6 flex items-center justify-center rounded ${roomBilling.isActive ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {roomBilling.isActive ? (
                <PowerOff className="w-3.5 h-3.5" />
              ) : (
                <Power className="w-3.5 h-3.5" />
              )}
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
      </div>
      
      {/* Locked Message */}
      {isLocked && (
        <div className="px-3 pb-3">
          <div className="py-2 px-3 bg-red-500/10 rounded border border-red-500/20 text-center">
            <p className="text-[10px] text-red-400">Ruangan tidak terhubung</p>
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
    </div>
  );
}

import { useEffect, useState } from 'react';
import type { RoomBilling } from '../types';
import { multiSocketService } from '../services/MultiSocketService';
import { billingConfig } from '../config/billing';
import { Clock, Wallet, Disc3, Power, PowerOff, Timer } from 'lucide-react';

interface RoomCardProps {
  roomBilling: RoomBilling;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(price);
}

export function RoomCard({ roomBilling }: RoomCardProps) {
  const [currentTime, setCurrentTime] = useState(roomBilling.currentDuration);
  const [durationInput, setDurationInput] = useState('');
  
  // Countdown timer for expiry
  const [countdown, setCountdown] = useState<number | null>(null);
  
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
    if (roomBilling.isActive) {
      await multiSocketService.deactivateRoom(roomBilling.roomId);
      setDurationInput('');
    } else {
      const duration = durationInput ? parseInt(durationInput, 10) : undefined;
      if (duration && duration > 0) {
        await multiSocketService.activateRoom(roomBilling.roomId, roomBilling.roomName, duration);
      } else {
        await multiSocketService.activateRoom(roomBilling.roomId, roomBilling.roomName);
      }
      setDurationInput('');
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
  
  useEffect(() => {
    if (roomBilling.status === 'playing') {
      const interval = setInterval(() => setCurrentTime(p => p + 1), 1000);
      return () => clearInterval(interval);
    }
  }, [roomBilling.status]);
  
  const displayDuration = roomBilling.status === 'playing' ? currentTime : roomBilling.currentDuration;
  const pricePerHour = 50000;
  const currentPrice = Math.ceil(displayDuration / 3600) * pricePerHour;
  
  const isLocked = billingConfig.enabled ? !roomBilling.isActive : false;
  const status = roomBilling.status;
  
  const borderColor = isLocked ? 'border-l-red-500' : status === 'playing' ? 'border-l-green-500' : status === 'paused' ? 'border-l-yellow-500' : 'border-l-gray-500';
  const iconColor = status === 'playing' ? 'text-green-400 bg-green-500/20' : status === 'paused' ? 'text-yellow-400 bg-yellow-500/20' : 'text-gray-400 bg-gray-500/20';
  const badgeColor = isLocked ? 'bg-red-500/20 text-red-400' : status === 'playing' ? 'bg-green-500/20 text-green-400' : status === 'paused' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-500/20 text-gray-400';
  const badgeText = isLocked ? 'TERKUNCI' : status === 'playing' ? 'DIPUTAR' : status === 'paused' ? 'DIJEDA' : 'TIDAK AKTIF';
  
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
        
        {/* Right: Button - same height as icon */}
        {billingConfig.enabled && (
          <button onClick={handleToggleActive} className={`w-6 h-6 flex items-center justify-center rounded ${roomBilling.isActive ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
            {roomBilling.isActive ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
      
      {/* Header - Row 2 */}
      <div className="px-3 pb-2 flex items-center justify-between">
        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${badgeColor}`}>
          {badgeText}
        </span>
        <div className="text-right">
          <p className="text-[9px] text-gray-500 uppercase">Tagihan</p>
          <p className="text-sm font-bold text-yellow-400">{formatPrice(currentPrice)}</p>
        </div>
      </div>
      
      {/* Locked Message */}
      {isLocked && (
        <div className="px-3 pb-3">
          <div className="py-2 px-3 bg-red-500/10 rounded border border-red-500/20 text-center">
            <p className="text-[10px] text-red-400">Ruangan terkunci</p>
          </div>
        </div>
      )}
      
      {/* Duration Input (only when not active) */}
      {!roomBilling.isActive && billingConfig.enabled && (
        <div className="px-3 pb-2">
          <div className="flex items-center gap-2">
            <Timer className="w-3.5 h-3.5 text-orange-400" />
            <input
              type="number"
              min="1"
              max="480"
              placeholder="Menit"
              value={durationInput}
              onChange={(e) => setDurationInput(e.target.value)}
              className="w-16 bg-[#0f0f1a] border border-white/10 rounded px-2 py-1 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-orange-500"
            />
            <span className="text-[10px] text-gray-500">(opsional)</span>
          </div>
        </div>
      )}
      
      {/* Info Rows */}
      {!isLocked && (
        <div className="px-3 pb-3 space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Clock className={`w-3.5 h-3.5 ${countdown !== null ? 'text-orange-400' : 'text-cyan-400'}`} />
              <span className="text-[10px] text-gray-400">{countdown !== null ? 'Sisa Waktu:' : 'Durasi:'}</span>
            </div>
            <span className={`text-xs font-semibold ${countdown !== null ? (isExpiringSoon ? 'text-red-400' : isWarning ? 'text-yellow-400' : 'text-orange-400') : 'text-white'}`}>
              {countdown !== null ? formatCountdown(countdown) : formatDuration(displayDuration)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-pink-400" />
              <span className="text-[10px] text-gray-400">Tarif:</span>
            </div>
            <span className="text-xs font-semibold text-white">{formatPrice(pricePerHour)}/jam</span>
          </div>
        </div>
      )}
      
      {/* Start Time */}
      {roomBilling.startTime && !isLocked && (
        <div className="px-3 pb-2 mt-auto border-t border-white/5">
          <p className="text-[9px] text-gray-500">
            <span className="text-purple-400">Mulai:</span> {new Date(roomBilling.startTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      )}
    </div>
  );
}

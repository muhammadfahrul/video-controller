import { useEffect, useState } from 'react';
import type { RoomBilling, AgentInfo } from '../types';
import { useRoomStore } from '../store/useRoomStore';
import { socketService } from '../services/SocketService';
import { billingConfig } from '../config/billing';
import { Play, Pause, Square, Clock, Wallet, Music, Disc3, Power, PowerOff } from 'lucide-react';

interface RoomCardProps {
  roomBilling: RoomBilling;
  agent?: AgentInfo;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}j ${minutes}m ${secs}d`;
  }
  return `${minutes}m ${secs}d`;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(price);
}

export function RoomCard({ roomBilling, agent }: RoomCardProps) {
  const { activateRoom, deactivateRoom } = useRoomStore();
  const [currentTime, setCurrentTime] = useState(roomBilling.currentDuration);
  
  const handleToggleActive = () => {
    if (roomBilling.isActive) {
      deactivateRoom(roomBilling.roomId);
      socketService.deactivateRoom(roomBilling.roomId);
    } else {
      activateRoom(roomBilling.roomId);
      socketService.activateRoom(roomBilling.roomId, roomBilling.roomName);
    }
  };
  
  useEffect(() => {
    if (roomBilling.status === 'playing') {
      const interval = setInterval(() => {
        setCurrentTime(prev => prev + 1);
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [roomBilling.status]);
  
  const displayDuration = roomBilling.status === 'playing' ? currentTime : roomBilling.currentDuration;
  const pricePerHour = 50000;
  const currentPrice = Math.ceil(displayDuration / 3600) * pricePerHour;
  
  const statusConfig = {
    idle: { 
      bg: 'bg-gray-500/20 border-gray-500/50 text-gray-400',
      icon: <Square className="w-4 h-4" />,
      text: 'TIDAK AKTIF',
      glow: 'shadow-gray-500/20'
    },
    playing: { 
      bg: 'bg-green-500/20 border-green-500/50 text-green-400',
      icon: <Play className="w-4 h-4" />,
      text: 'SEDANG DIPUTAR',
      glow: 'shadow-green-500/30'
    },
    paused: { 
      bg: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400',
      icon: <Pause className="w-4 h-4" />,
      text: 'DIJEDA',
      glow: 'shadow-yellow-500/20'
    },
    waiting: { 
      bg: 'bg-orange-500/20 border-orange-500/50 text-orange-400',
      icon: <Clock className="w-4 h-4" />,
      text: 'MENUNGGU',
      glow: 'shadow-orange-500/20'
    }
  };
  
  // Check agent status for waiting state
  const agentStatus = agent?.status;
  const isWaiting = agentStatus === 'WAITING';
  const status = isWaiting ? statusConfig.waiting : statusConfig[roomBilling.status];

  // If billing is disabled, rooms are always unlocked (active)
  // If billing is enabled, check roomBilling.isActive
  const isLocked = billingConfig.enabled ? !roomBilling.isActive : false;
  
  return (
    <div className={`neon-card rounded-xl p-6 border-l-4 ${isLocked ? 'border-l-red-500 opacity-60' : roomBilling.status === 'playing' ? 'border-l-green-500' : roomBilling.status === 'paused' ? 'border-l-yellow-500' : 'border-l-gray-500'} ${status.glow}`}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-xl ${roomBilling.status === 'playing' ? 'bg-gradient-to-br from-green-500/30 to-green-600/10' : roomBilling.status === 'paused' ? 'bg-gradient-to-br from-yellow-500/30 to-yellow-600/10' : 'bg-gradient-to-br from-gray-500/30 to-gray-600/10'}`}>
            <Disc3 className={`w-6 h-6 ${roomBilling.status === 'playing' ? 'text-green-400 animate-spin' : roomBilling.status === 'paused' ? 'text-yellow-400' : 'text-gray-400'}`} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">
              {roomBilling.roomName}
            </h3>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${isLocked ? 'bg-red-500/20 border border-red-500/50 text-red-400' : status.bg} mt-1`}>
              {isLocked ? <PowerOff className="w-4 h-4" /> : status.icon}
              {isLocked ? 'TERKUNCI' : status.text}
            </span>
          </div>
        </div>
        {/* Activation Button - only show when billing is enabled */}
        {billingConfig.enabled && (
          <button
            onClick={handleToggleActive}
            className={`p-2 rounded-lg transition-all duration-200 ${
              roomBilling.isActive 
                ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400' 
                : 'bg-green-500/20 hover:bg-green-500/30 text-green-400'
            }`}
            title={roomBilling.isActive ? 'Nonaktifkan Ruangan' : 'Aktifkan Ruangan'}
          >
            {roomBilling.isActive ? (
              <PowerOff className="w-5 h-5" />
            ) : (
              <Power className="w-5 h-5" />
            )}
          </button>
        )}
        <div className="text-right">
          <p className="text-xs text-gray-400 uppercase tracking-wider">Total Tagihan</p>
          <p className="text-2xl font-bold text-yellow-400 neon-text">
            {formatPrice(currentPrice)}
          </p>
        </div>
      </div>
      
      {/* Show music info only if active */}
      {isLocked && (
        <div className="mb-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
          <div className="flex items-center justify-center gap-2 text-gray-400">
            <PowerOff className="w-5 h-5" />
            <p className="text-sm font-medium">Ruangan terkunci - Aktifkan untuk memulai</p>
          </div>
        </div>
      )}
      
      {agent?.player?.title && !isLocked && (
        <div className="mb-4 p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
          <div className="flex items-center gap-2 mb-1">
            <Music className="w-4 h-4 text-purple-400" />
            <p className="text-xs text-purple-400 uppercase tracking-wider">Sedang Diputar</p>
          </div>
          <p className="font-medium text-white truncate">
            {agent.player.title}
          </p>
        </div>
      )}
      
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-3 p-3 bg-black/20 rounded-lg">
          <Clock className="w-5 h-5 text-cyan-400" />
          <div>
            <p className="text-xs text-gray-400">Durasi</p>
            <p className="font-bold text-white text-lg">
              {formatDuration(displayDuration)}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 p-3 bg-black/20 rounded-lg">
          <Wallet className="w-5 h-5 text-pink-400" />
          <div>
            <p className="text-xs text-gray-400">Tarif</p>
            <p className="font-bold text-white text-lg">
              {formatPrice(pricePerHour)}
            </p>
            <p className="text-xs text-gray-500">per jam</p>
          </div>
        </div>
      </div>
      
      {roomBilling.startTime && (
        <div className="mt-4 pt-4 border-t border-purple-500/20">
          <p className="text-sm text-gray-400">
            <span className="text-purple-400">Mulai:</span> {new Date(roomBilling.startTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
        </div>
      )}
    </div>
  );
}

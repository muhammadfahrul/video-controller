import { useState, useEffect } from 'react';
import { useRoomStore } from '../store/useRoomStore';
import { socketService } from '../services/SocketService';
import { RoomCard } from '../components/RoomCard';
import { RefreshCw, Mic, Users, Tv, TrendingUp, Zap, Wifi, WifiOff } from 'lucide-react';

export default function DashboardPage() {
  const { rooms, agents, setAgents } = useRoomStore();
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  
  useEffect(() => {
    // First, set up the callback
    const unsubscribe = socketService.onAgentUpdate((updatedAgents) => {
      console.log('[Dashboard] Received agents:', updatedAgents);
      setAgents(updatedAgents);
      setIsLoading(false);
    });
    
    // Then connect
    socketService.connect();
    
    // Also listen for connection status
    const checkConnection = setInterval(() => {
      if (socketService.isConnected()) {
        setConnectionStatus('connected');
      } else {
        setConnectionStatus('disconnected');
      }
    }, 1000);
    
    return () => {
      unsubscribe();
      clearInterval(checkConnection);
    };
  }, [setAgents]);
  
  const roomList = Array.from(rooms.values());
  
  const getAgentForRoom = (roomId: string) => {
    return agents.find(a => a.roomId === roomId);
  };

  const activeRooms = roomList.filter(r => r.status === 'playing').length;
  // Count all non-OFFLINE agents as connected
  const connectedAgents = agents.filter(a => a.status !== 'OFFLINE').length;
  const totalRevenue = roomList.reduce((sum, r) => {
    const pricePerHour = 50000;
    const price = Math.ceil(r.currentDuration / 3600) * pricePerHour;
    return sum + price;
  }, 0);

  const stats = [
    {
      label: 'Total Ruangan',
      value: roomList.length,
      icon: Tv,
      color: 'blue',
      gradient: 'from-blue-500/20 to-blue-600/10'
    },
    {
      label: 'Sedang Aktif',
      value: activeRooms,
      icon: Zap,
      color: 'green',
      gradient: 'from-green-500/20 to-green-600/10'
    },
    {
      label: 'Agent Online',
      value: connectedAgents,
      icon: Users,
      color: 'cyan',
      gradient: 'from-cyan-500/20 to-cyan-600/10'
    },
    {
      label: 'Total Pendapatan',
      value: new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totalRevenue),
      icon: TrendingUp,
      color: 'yellow',
      gradient: 'from-yellow-500/20 to-yellow-600/10',
      isFormatted: true
    }
  ];

  const colorMap: Record<string, string> = {
    blue: 'text-blue-400 bg-blue-500/20',
    green: 'text-green-400 bg-green-500/20',
    cyan: 'text-cyan-400 bg-cyan-500/20',
    yellow: 'text-yellow-400 bg-yellow-500/20'
  };

  return (
    <div className="w-full space-y-6">
      {/* Connection Status Banner */}
      <div className={`flex items-center justify-between px-6 py-2 rounded-lg ${
        connectionStatus === 'connected' ? 'bg-green-500/20 border border-green-500/30' : 
        connectionStatus === 'connecting' ? 'bg-yellow-500/20 border border-yellow-500/30' :
        'bg-red-500/20 border border-red-500/30'
      }`}>
        <div className="flex items-center gap-2">
          {connectionStatus === 'connected' ? (
            <Wifi className="w-4 h-4 text-green-400" />
          ) : connectionStatus === 'connecting' ? (
            <RefreshCw className="w-4 h-4 text-yellow-400 animate-spin" />
          ) : (
            <WifiOff className="w-4 h-4 text-red-400" />
          )}
          <span className={`text-sm ${
            connectionStatus === 'connected' ? 'text-green-400' : 
            connectionStatus === 'connecting' ? 'text-yellow-400' :
            'text-red-400'
          }`}>
            {connectionStatus === 'connected' ? 'Terhubung ke server' : 
             connectionStatus === 'connecting' ? 'Menghubungkan...' :
             'Tidak terhubung'}
          </span>
        </div>
        <div className="text-xs text-gray-400">
          Agent: {agents.length} | Room: {roomList.length}
        </div>
      </div>

      {/* Stats Grid - Responsive for large monitors */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div 
              key={index}
              className={`
                relative overflow-hidden rounded-xl p-4 
                bg-gradient-to-br ${stat.gradient}
                border border-white/5
                hover:scale-[1.02] transition-transform duration-200
              `}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-gray-400 mb-1">{stat.label}</p>
                  <p className={`text-xl lg:text-2xl font-bold ${stat.isFormatted ? 'text-yellow-400' : 'text-white'}`}>
                    {stat.value}
                  </p>
                </div>
                <div className={`p-2 rounded-lg ${colorMap[stat.color]}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Room List Section */}
      <div className="w-full">
        <div className="flex items-center gap-2 mb-4">
          <Mic className="w-5 h-5 text-pink-400" />
          <h2 className="text-lg font-semibold text-white">Ruangan Karaoke</h2>
          <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">
            {roomList.length} ruangan
          </span>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="relative">
              <RefreshCw className="w-12 h-12 text-purple-500 animate-spin" />
              <div className="absolute inset-0 w-12 h-12 bg-purple-500/20 rounded-full animate-ping" />
            </div>
            <p className="text-gray-400 mt-4">Memuat data ruangan...</p>
          </div>
        ) : roomList.length === 0 ? (
          <div className="neon-card rounded-xl p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-500/20 flex items-center justify-center">
              <Mic className="w-8 h-8 text-purple-400" />
            </div>
            <p className="text-white text-lg mb-2">Belum ada ruangan</p>
            <p className="text-gray-400 text-sm">Pastikan agent telah berjalan di setiap PC ruangan</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
            {roomList.map((roomBilling) => (
              <RoomCard 
                key={roomBilling.roomId}
                roomBilling={roomBilling}
                agent={getAgentForRoom(roomBilling.roomId)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

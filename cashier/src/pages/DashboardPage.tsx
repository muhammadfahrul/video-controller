import { useState, useEffect } from 'react';
import { useRoomStore } from '../store/useRoomStore';
import { useTransactionStore } from '../store/useTransactionStore';
import { multiSocketService } from '../services/MultiSocketService';
import { RoomCard } from '../components/RoomCard';
import { Tv, TrendingUp, Wifi, WifiOff, Server, CircleDot } from 'lucide-react';

export default function DashboardPage() {
  const { roomConfigs, connectionStatus, setRoomConnected, setLoading: setRoomLoading } = useRoomStore();
  const setTransactionLoading = useTransactionStore((state) => state.setLoading);
  const [roomBillings, setRoomBillings] = useState<Map<string, any>>(new Map());
  const [hasNavigated, setHasNavigated] = useState(false);
  
  useEffect(() => {
    // Mark that we've navigated to this page
    setHasNavigated(true);
    
    const unsubscribeUpdate = multiSocketService.onUpdate((billings) => {
      setRoomBillings(billings);
    });
    const unsubscribeStatus = multiSocketService.onStatusChange((roomId, connected) => {
      setRoomConnected(roomId, connected);
    });
    useRoomStore.getState().initFromEnv();
    
    // Cleanup subscriptions when component unmounts
    return () => {
      unsubscribeUpdate();
      unsubscribeStatus();
    };
  }, [setRoomConnected]);
  
  // Clear global loading when data is received from server (connection established)
  useEffect(() => {
    if (!hasNavigated) return;
    
    // Check if we already have data (connection already established)
    if (roomBillings && roomBillings.size > 0) {
      console.log('[Dashboard] Data already available, clearing loadings');
      setRoomLoading(false);
      setTransactionLoading(false);
      return;
    }
    
    // Listen for first update to clear loading (connection established)
    const unsubscribe = multiSocketService.onUpdate(() => {
      console.log('[Dashboard] First data received, clearing loadings');
      setRoomLoading(false);
      setTransactionLoading(false);
    });
    
    // Fallback timeout in case no data is received
    const timeoutId = setTimeout(() => {
      console.log('[Dashboard] Timeout, clearing loadings');
      setRoomLoading(false);
      setTransactionLoading(false);
    }, 5000);
    
    return () => {
      unsubscribe();
      clearTimeout(timeoutId);
    };
  }, [hasNavigated, setRoomLoading, setTransactionLoading]);
  
  const roomList = Array.from(roomBillings?.values?.() || []);
  const statusMap = connectionStatus instanceof Map ? connectionStatus : new Map();
  const connectedCount = Array.from(statusMap.values()).filter(Boolean).length;
  const totalCount = roomConfigs.length;
  
  // Check if any connection is currently in progress
  const isAnyConnecting = Array.from(statusMap.values()).some(v => v === null);
  const connectionStatusDisplay = totalCount === 0 
    ? 'disconnected' 
    : connectedCount === totalCount 
      ? 'connected' 
      : connectedCount > 0 
        ? 'partial'  // Some connected, some not - don't show "connecting" 
        : isAnyConnecting 
          ? 'connecting' 
          : 'disconnected';

  const activeRooms = roomList.filter(r => r.isActive).length;
  const connectedRooms = connectedCount;
  const totalRevenue = roomList.reduce((sum, r) => sum + Math.ceil(r.currentDuration / 3600) * 50000, 0);

  const stats = [
    { label: 'Ruangan', value: roomConfigs.length, icon: Tv, color: 'blue' },
    { label: 'Aktif', value: activeRooms, icon: CircleDot, color: 'green' },
    { label: 'Online', value: connectedRooms, icon: Wifi, color: 'cyan' },
    { label: 'Pendapatan', value: new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totalRevenue), icon: TrendingUp, color: 'yellow', isFormatted: true }
  ];

  const colorMap: Record<string, string> = {
    blue: 'text-blue-400 bg-blue-500/20',
    green: 'text-green-400 bg-green-500/20',
    cyan: 'text-cyan-400 bg-cyan-500/20',
    yellow: 'text-yellow-400 bg-yellow-500/20'
  };

  return (
    <div className="w-full mx-auto space-y-4">
      {/* Status */}
      <div className={`flex items-center justify-between px-4 py-2 rounded-lg text-xs ${
        connectionStatusDisplay === 'connected' ? 'bg-green-500/20 border border-green-500/30 text-green-400' : 
        connectionStatusDisplay === 'connecting' ? 'bg-yellow-500/20 border border-yellow-500/30 text-yellow-400' :
        connectionStatusDisplay === 'partial' ? 'bg-orange-500/20 border border-orange-500/30 text-orange-400' :
        'bg-red-500/20 border border-red-500/30 text-red-400'
      }`}>
        <div className="flex items-center gap-2">
          {connectionStatusDisplay === 'connected' ? <Wifi className="w-3.5 h-3.5" /> : connectionStatusDisplay === 'connecting' ? <TrendingUp className="w-3.5 h-3.5 animate-spin" /> : <WifiOff className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">
            {connectionStatusDisplay === 'connected' ? `${connectedCount} server terhubung` : 
             connectionStatusDisplay === 'connecting' ? `Menghubungkan...` :
             connectionStatusDisplay === 'partial' ? `${connectedCount}/${totalCount} terhubung` :
             totalCount === 0 ? 'Belum ada ruangan' : `${connectedCount}/${totalCount} terhubung`}
          </span>
          <span className="sm:hidden">
            {connectionStatusDisplay === 'connected' ? `${connectedCount} trhubung` : 
             connectionStatusDisplay === 'connecting' ? `Menghubungkan...` :
             connectionStatusDisplay === 'partial' ? `${connectedCount}/${totalCount}` :
             totalCount === 0 ? 'Belum ada' : `${connectedCount}/${totalCount}`}
          </span>
        </div>
        <span className="text-gray-500">{roomList.length} room</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((stat, index) => (
          <div key={index} className="bg-[#1a1a2e] rounded-lg p-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-gray-500 uppercase">{stat.label}</p>
              <p className={`text-lg font-bold ${stat.isFormatted ? 'text-yellow-400' : 'text-white'}`}>{stat.value}</p>
            </div>
            <div className={`p-2 rounded ${colorMap[stat.color]}`}>
              <stat.icon className="w-4 h-4" />
            </div>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center gap-2">
        <h2 className="text-base font-semibold text-white">Ruangan Karaoke</h2>
        <span className="text-[10px] text-gray-500 bg-gray-800 px-2 py-0.5 rounded">{roomList.length}</span>
      </div>

      {/* Room Grid */}
      {roomList.length === 0 ? (
        <div className="bg-[#1a1a2e] rounded-lg p-8 text-center border border-dashed border-gray-700">
          <Server className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Belum ada ruangan</p>
          <p className="text-gray-600 text-xs mt-1">Klik "Tambah Ruangan" untuk menambahkan</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {roomList.map((roomBilling) => (
            <RoomCard key={roomBilling.roomId} roomBilling={roomBilling} />
          ))}
        </div>
      )}
    </div>
  );
}

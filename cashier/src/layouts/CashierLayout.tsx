import { Outlet } from "react-router-dom";
import { useState, useEffect } from 'react';
import { socketService } from '../services/SocketService';
import { Wifi, WifiOff, Mic, Crown } from 'lucide-react';

export default function CashierLayout() {
  const [isConnected, setIsConnected] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const checkConnection = setInterval(() => {
      setIsConnected(socketService.isConnected());
    }, 1000);

    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      clearInterval(checkConnection);
      clearInterval(timeInterval);
    };
  }, []);

  const formattedTime = currentTime.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const formattedDate = currentTime.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="min-h-screen bg-[#0a0a14] relative overflow-hidden w-full">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none w-full h-full">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl" />
      </div>

      {/* Connection Status Banner */}
      <div
        className={`
          relative z-10 flex items-center justify-between px-6 py-2 text-sm font-medium backdrop-blur-sm w-full
          ${isConnected 
            ? 'bg-green-500/10 border-b border-green-500/30 text-green-400' 
            : 'bg-red-500/10 border-b border-red-500/30 text-red-400'
          }
        `}
      >
        <div className="flex items-center gap-2">
          {isConnected ? (
            <>
              <Wifi className="w-4 h-4 animate-pulse" />
              <span>TERHUBUNG KE SERVER</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4" />
              <span>TERPUTUS DARI SERVER</span>
            </>
          )}
        </div>
        <div className="text-xs opacity-70">
          {formattedTime}
        </div>
      </div>

      {/* Main Container - Full width for monitor display */}
      <div className="relative z-10 flex min-h-[calc(100vh-40px)] flex-col bg-[#12121f] w-full">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-500/30 px-6 py-4 bg-gradient-to-r from-purple-900/20 via-pink-900/10 to-transparent">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="p-3 bg-gradient-to-br from-purple-600 via-pink-600 to-purple-600 rounded-xl shadow-lg shadow-purple-500/30">
                <Mic className="w-7 h-7 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
                <Crown className="w-2.5 h-2.5 text-black" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
                KARAOKE BILLING
              </h1>
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                Sistem Manajemen Ruangan Karaoke
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold text-white">{formattedTime}</p>
            <p className="text-xs text-gray-400">{formattedDate}</p>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="border-t border-purple-500/20 px-6 py-3 text-center">
          <p className="text-xs text-gray-500">
            🎤 Video Controller - Karaoke Billing System
          </p>
        </footer>
      </div>
    </div>
  );
}

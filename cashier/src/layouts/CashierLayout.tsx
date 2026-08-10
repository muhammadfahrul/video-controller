import { Outlet } from "react-router-dom";
import { useState, useEffect } from 'react';
import { Mic } from 'lucide-react';
import { useLoading } from '../context/LoadingContext';
import { FullPageLoading, loadingDurations } from '../components/FullPageLoading';

export default function CashierLayout() {
  const [currentTime, setCurrentTime] = useState(new Date());

  const { isLoading, loadingType: activeLoadingType, loadingMessage: activeLoadingMessage, setLoading } = useLoading();

  // Auto-clear loading after duration timeout
  useEffect(() => {
    if (!isLoading) return;

    const duration = loadingDurations[activeLoadingType] || 5000;
    const timeoutId = setTimeout(() => {
      console.log('[CashierLayout] Auto-clearing loading after timeout:', duration);
      setLoading(false);
    }, duration);

    return () => clearTimeout(timeoutId);
  }, [isLoading, activeLoadingType, setLoading]);
  
  // Debug log
  useEffect(() => {
    console.log('[CashierLayout] isLoading:', isLoading, 'type:', activeLoadingType, 'message:', activeLoadingMessage);
  }, [isLoading, activeLoadingType, activeLoadingMessage]);

  useEffect(() => {
    const timeInterval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => { clearInterval(timeInterval); };
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a14] w-full">
      {/* Full Page Loading Overlay */}
      <FullPageLoading isLoading={isLoading} type={activeLoadingType} message={activeLoadingMessage} />
      
      {/* Main */}
      <div className="flex flex-col min-h-screen bg-[#12121f]">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 sm:px-6 py-3 border-b border-purple-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-600 rounded-lg">
                <Mic className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">KARAOKE BILLING</h1>
                <p className="text-[10px] text-gray-500">Sistem Manajemen Ruangan Karaoke</p>
              </div>
            </div>
            <div className="sm:hidden text-right">
              <p className="text-sm font-semibold text-white">{currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
              <p className="text-[10px] text-gray-500">{currentTime.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</p>
            </div>
          </div>
          <div className="hidden sm:block text-right">
            <p className="text-sm font-semibold text-white">{currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
            <p className="text-[10px] text-gray-500">{currentTime.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto w-full px-4 sm:px-6 py-4">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="border-t border-purple-500/10 px-4 py-2 text-center">
          <p className="text-[10px] text-gray-600">Video Controller - Karaoke Billing System</p>
        </footer>
      </div>
    </div>
  );
}

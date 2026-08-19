import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRoomConfig } from '../context/RoomConfigContext';
import { useLoading } from '../context/LoadingContext';
import { multiSocketService } from '../services/MultiSocketService';
import { getRoomStatus, type RoomStatusLabel } from '../utils/roomStatus';
import { Disc3, ArrowRightLeft, X, Timer, User } from 'lucide-react';
import type { RoomBilling, Transaction } from '../types';

// Only these statuses mean the room is physically ready for a new customer
const VALID_TARGET_STATUSES: RoomStatusLabel[] = ['ONLINE', 'SUDAH DIBERSIHKAN'];

interface MoveRoomModalProps {
  roomBilling: RoomBilling;
  onClose: () => void;
  onMoveComplete: () => void;
}

function formatCountdown(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export function MoveRoomModal({ roomBilling, onClose, onMoveComplete }: MoveRoomModalProps) {
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [roomBillings, setRoomBillings] = useState<Map<string, RoomBilling>>(() => multiSocketService.getRoomBillings());
  const { setLoading: setGlobalLoading } = useLoading();
  const { roomConfigs } = useRoomConfig();
  const [transactions, setTransactions] = useState<Transaction[]>(() => multiSocketService.getTransactions());

  // Keep target room statuses live while the modal is open
  useEffect(() => {
    const unsubscribe = multiSocketService.onUpdate((billings) => setRoomBillings(billings));
    return unsubscribe;
  }, []);

  // Keep transactions live while the modal is open
  useEffect(() => {
    return multiSocketService.onTransactionsUpdate(setTransactions);
  }, []);

  const findTargetBilling = (roomName: string): RoomBilling | undefined => {
    const nameKey = roomName.toLowerCase();
    return Array.from(roomBillings.values()).find(b => b.roomName.toLowerCase() === nameKey);
  };

  const handleMove = async () => {
    if (!selectedTarget) return;

    // Calculate remaining time in minutes
    let remainingMinutes: number | undefined;
    if (roomBilling.expiresAt && roomBilling.expiresAt > Date.now()) {
      remainingMinutes = Math.ceil((roomBilling.expiresAt - Date.now()) / 60000);
    }

    setGlobalLoading(true, 'moving');
    try {
      const targetConfig = roomConfigs.find(c => c.id === selectedTarget || c.name.toLowerCase() === selectedTarget.toLowerCase());

      if (!targetConfig) {
        alert('Ruangan tujuan tidak ditemukan');
        setGlobalLoading(false);
        return;
      }

      const isTargetConnected = multiSocketService.isConnected(targetConfig.id || targetConfig.name) ||
        multiSocketService.isConnected(targetConfig.id?.replace('env-', '') || targetConfig.name.toLowerCase().replace(/\s+/g, '-'));

      if (!isTargetConnected) {
        alert('Ruangan tujuan sedang offline. Silakan pilih ruangan lain yang sedang online.');
        setGlobalLoading(false);
        return;
      }

      // Re-validate target status at submit time too, in case it changed
      // (e.g. activated by another cashier) since the modal was opened.
      const targetBilling = findTargetBilling(targetConfig.name);
      const targetStatus = targetBilling ? getRoomStatus(targetBilling, transactions).label : null;
      if (!targetStatus || !VALID_TARGET_STATUSES.includes(targetStatus)) {
        alert('Ruangan tujuan tidak lagi siap dipakai (sudah aktif/belum bersih). Silakan pilih ruangan lain.');
        setGlobalLoading(false);
        return;
      }

      // Deactivate current room (reason 'move': no transaction is recorded here,
      // it's recorded at the target room instead once the session actually ends)
      await multiSocketService.deactivateRoom(roomBilling.roomId, undefined, 'move', () => {});

      await new Promise(resolve => setTimeout(resolve, 500));

      // Activate target room, carrying over the original session's startTime so
      // the eventual transaction bills the full session once (at the target's price)
      const billing = roomBilling;
      if (billing.customerName || billing.customerPhone || billing.customerEmail || billing.customerNote) {
        await multiSocketService.activateRoom(
          targetConfig.id || selectedTarget,
          targetConfig.name,
          remainingMinutes,
          billing.customerName,
          billing.customerPhone,
          billing.customerEmail,
          billing.customerNote ? `${billing.customerNote} (Pindahan dari ${roomBilling.roomName})` : `Pindahan dari ${roomBilling.roomName}`,
          () => {},
          billing.startTime ?? undefined,
          undefined,
          billing.expiresAt ?? undefined
        );
      } else {
        await multiSocketService.activateRoom(
          targetConfig.id || selectedTarget,
          targetConfig.name,
          remainingMinutes,
          undefined,
          undefined,
          undefined,
          `Pindahan dari ${roomBilling.roomName}`,
          () => {},
          billing.startTime ?? undefined,
          undefined,
          billing.expiresAt ?? undefined
        );
      }

      onMoveComplete();
      onClose();
    } catch (error) {
      console.error('[MoveRoomModal] Move error:', error);
      alert('Gagal memindahkan ruangan. Silakan coba lagi.');
    } finally {
      setGlobalLoading(false);
    }
  };

  const availableRooms = roomConfigs.filter(c =>
    c.id !== roomBilling.roomId && c.name.toLowerCase() !== roomBilling.roomName.toLowerCase()
  );
  
  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4" style={{ isolation: 'isolate' }}>
      <div className="bg-[#1a1a2e] rounded-xl w-full max-w-md shadow-2xl" style={{ position: 'relative', zIndex: 10000 }}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-600/20 rounded-lg">
              <ArrowRightLeft className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Pindahkan Ruangan</h2>
              <p className="text-xs text-gray-500">{roomBilling.roomName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        
        {/* Current Room Info */}
        <div className="p-4 border-b border-white/5">
          <div className="bg-[#0f0f1a] rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Disc3 className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-gray-400">Dari Ruangan</span>
              </div>
              <span className="text-sm font-medium text-white">{roomBilling.roomName}</span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Timer className="w-4 h-4 text-orange-400" />
                <span className="text-sm text-gray-400">Sisa Waktu</span>
              </div>
              <span className="text-sm font-medium text-orange-400">
                {roomBilling.expiresAt && roomBilling.expiresAt > Date.now() 
                  ? formatCountdown(Math.floor((roomBilling.expiresAt - Date.now()) / 1000))
                  : '--:--'}
              </span>
            </div>
            {roomBilling.customerName && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-400">Customer</span>
                </div>
                <span className="text-sm text-white">{roomBilling.customerName}</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Target Room Label */}
        <div className="px-4 pt-4 pb-2">
          <p className="text-xs text-gray-500 uppercase">Pilih Ruangan Tujuan</p>
        </div>
        
        {/* Room list */}
        <div className="px-4 pb-4 space-y-2 max-h-60 overflow-y-auto">
          {availableRooms.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-gray-500 text-sm">Tidak ada ruangan lain tersedia</p>
            </div>
          ) : (
            availableRooms.map(config => {
              const isSelected = selectedTarget === config.id || selectedTarget === config.name;
              const isConnected = multiSocketService.isConnected(config.id || config.name) ||
                multiSocketService.isConnected(config.id?.replace('env-', '') || config.name.toLowerCase().replace(/\s+/g, '-'));
              const targetBilling = findTargetBilling(config.name);
              const targetStatus = isConnected && targetBilling ? getRoomStatus(targetBilling, transactions).label : null;
              const isReady = !!targetStatus && VALID_TARGET_STATUSES.includes(targetStatus);
              const isDisabled = !isConnected || !isReady;
              const statusLabel = !isConnected ? 'Offline' : (targetStatus ?? '-');

              return (
                <button
                  key={config.id}
                  onClick={() => !isDisabled && setSelectedTarget(config.id || config.name)}
                  disabled={isDisabled}
                  title={isDisabled && isConnected ? 'Ruangan hanya bisa jadi tujuan jika berstatus ONLINE atau SUDAH DIBERSIHKAN' : undefined}
                  className={`w-full p-3 rounded-lg border text-left transition-all ${
                    isDisabled
                      ? 'border-white/5 bg-[#0f0f1a] text-gray-600 cursor-not-allowed'
                      : isSelected
                        ? 'border-cyan-500 bg-cyan-500/10 text-white'
                        : 'border-white/5 bg-[#0f0f1a] text-gray-300 hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Disc3 className={`w-4 h-4 ${isReady ? 'text-green-400' : 'text-gray-600'}`} />
                      <span className="font-medium">{config.name}</span>
                    </div>
                    <span className={`text-xs ${isReady ? 'text-green-400' : 'text-red-400'}`}>
                      {statusLabel}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
        
        {/* Action Buttons */}
        <div className="p-4 border-t border-white/10 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg border border-white/10 text-gray-300 hover:bg-white/5 font-medium"
          >
            Batal
          </button>
          <button
            onClick={handleMove}
            disabled={!selectedTarget}
            className={`flex-1 px-4 py-2.5 rounded-lg font-medium ${
              selectedTarget
                ? 'bg-cyan-600 text-white hover:bg-cyan-500'
                : 'bg-white/10 text-gray-500 cursor-not-allowed'
            }`}
          >
            Pindahkan
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

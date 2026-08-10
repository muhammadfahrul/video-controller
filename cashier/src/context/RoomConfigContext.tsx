import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { RoomConfig } from '../types';
import { multiSocketService } from '../services/MultiSocketService';

interface RoomConfigContextValue {
  roomConfigs: RoomConfig[];
  connectionStatus: Map<string, boolean>;
  setRoomConnected: (roomId: string, connected: boolean) => void;
}

const RoomConfigContext = createContext<RoomConfigContextValue | null>(null);

// Load rooms from .env
function loadRoomsFromEnv(): RoomConfig[] {
  try {
    const envRooms = import.meta.env.VITE_ROOMS;
    if (!envRooms) {
      console.warn('[RoomConfig] VITE_ROOMS tidak di-set di .env. PC Kasir tidak akan bisa terhubung ke ruangan manapun.');
      return [];
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(envRooms);
    } catch (e) {
      console.error('[RoomConfig] Gagal parse VITE_ROOMS. Pastikan format JSON valid:', e);
      console.error('[RoomConfig] Contoh: [{"roomId":"room-001","name":"Room 1","ip":"192.168.1.10","port":53331,"pricePerHour":50000}]');
      return [];
    }

    if (!Array.isArray(parsed)) {
      console.error('[RoomConfig] VITE_ROOMS harus berupa JSON array.');
      return [];
    }

    const seenRoomIds = new Set<string>();
    const seenIps = new Map<string, number>(); // ip -> count

    return parsed.map((room: any, index: number) => {
      const roomId = room.roomId || `env-room-${index}`;

      // Validasi roomId wajib
      if (!room.roomId) {
        console.warn(`[RoomConfig] Ruangan #${index + 1} (${room.name || 'tanpa nama'}) tidak punya 'roomId'. Disarankan isi 'roomId' agar sinkron dengan agent (.env ROOM_ID).`);
      }

      // Validasi IP tidak kosong
      const ip = room.ip || '127.0.0.1';
      if (!room.ip) {
        console.warn(`[RoomConfig] Ruangan #${index + 1} (${room.name || roomId}) tidak punya 'ip'. Default ke 127.0.0.1.`);
      }

      const port = room.port || 53331;

      // Validasi duplikat
      if (seenRoomIds.has(roomId)) {
        console.warn(`[RoomConfig] Duplikat roomId terdeteksi: '${roomId}'. Pastikan setiap ruangan punya roomId unik.`);
      }
      seenRoomIds.add(roomId);

      // Info shared IP (tidak masalah, hanya warning)
      const ipCount = seenIps.get(`${ip}:${port}`) || 0;
      seenIps.set(`${ip}:${port}`, ipCount + 1);

      return {
        id: roomId,
        name: room.name || `Room ${index + 1}`,
        roomId: room.roomId,
        ip,
        port,
        pricePerHour: room.pricePerHour ?? 50000,
      };
    });
  } catch (e) {
    console.error('[RoomConfig] Gagal load VITE_ROOMS:', e);
    return [];
  }
}

export function RoomConfigProvider({ children }: { children: ReactNode }) {
  // Always initialize from .env - never from storage. Static after startup
  // (no add/remove-room UI exists), so this never needs to be re-set.
  const [roomConfigs] = useState<RoomConfig[]>(() => loadRoomsFromEnv());
  const [connectionStatus, setConnectionStatus] = useState<Map<string, boolean>>(new Map());

  const setRoomConnected = useCallback((roomId: string, connected: boolean) => {
    setConnectionStatus((prev) => {
      const next = new Map(prev);
      next.set(roomId, connected);
      return next;
    });
  }, []);

  // Connect to all env-configured rooms once, for the lifetime of the app.
  // No cleanup: this provider never legitimately unmounts.
  useEffect(() => {
    roomConfigs.forEach((config) => {
      multiSocketService.addRoom(config);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<RoomConfigContextValue>(() => ({
    roomConfigs,
    connectionStatus,
    setRoomConnected,
  }), [roomConfigs, connectionStatus, setRoomConnected]);

  return <RoomConfigContext.Provider value={value}>{children}</RoomConfigContext.Provider>;
}

export function useRoomConfig(): RoomConfigContextValue {
  const ctx = useContext(RoomConfigContext);
  if (!ctx) {
    throw new Error('useRoomConfig must be used within a RoomConfigProvider');
  }
  return ctx;
}

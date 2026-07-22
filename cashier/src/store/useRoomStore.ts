import { create } from 'zustand';
import type { Room, RoomBilling, AgentInfo } from '../types';

interface RoomStore {
  rooms: Map<string, RoomBilling>;
  agents: AgentInfo[];
  
  // Actions
  updateAgent: (agent: AgentInfo) => void;
  setAgents: (agents: AgentInfo[]) => void;
  setRooms: (rooms: Room[]) => void;
  getRoomBilling: (roomId: string) => RoomBilling | undefined;
  activateRoom: (roomId: string) => void;
  deactivateRoom: (roomId: string) => void;
}

export const useRoomStore = create<RoomStore>((set, get) => ({
  rooms: new Map(),
  agents: [],
  
  setAgents: (agents: AgentInfo[]) => {
    set((state) => {
      const newRooms = new Map(state.rooms);
      
      // Update rooms based on agent data
      // For EACH agent, create or update a room
      agents.forEach(agent => {
        // Skip agents without roomId
        if (!agent.roomId) {
          console.log('[Store] Skipping agent without roomId:', agent);
          return;
        }
        
        const existingRoom = newRooms.get(agent.roomId) || {
          roomId: agent.roomId,
          roomName: agent.roomName || `Ruangan ${agent.roomId}`,
          startTime: null,
          currentDuration: 0,
          totalPrice: 0,
          status: 'idle' as const,
          isActive: agent.isActive ?? false,
        };
        
        // Update room info from agent
        existingRoom.roomName = agent.roomName || existingRoom.roomName;
        existingRoom.isActive = agent.isActive ?? false;
        
        // Map agent status to room status
        if (agent.status === 'PLAYING') {
          existingRoom.status = 'playing';
          if (!existingRoom.startTime) {
            existingRoom.startTime = Date.now();
          }
          existingRoom.currentDuration = existingRoom.startTime 
            ? Math.floor((Date.now() - existingRoom.startTime) / 1000)
            : 0;
        } else if (agent.status === 'PAUSED') {
          existingRoom.status = 'paused';
        } else if (agent.status === 'WAITING') {
          existingRoom.status = 'idle';
        } else {
          existingRoom.status = 'idle';
        }
        
        const player = agent.player;
        if (player) {
          if (player.state === 'playing') {
            existingRoom.status = 'playing';
            if (!existingRoom.startTime) {
              existingRoom.startTime = Date.now();
            }
            existingRoom.currentDuration = existingRoom.startTime 
              ? Math.floor((Date.now() - existingRoom.startTime) / 1000)
              : 0;
          } else if (player.state === 'paused') {
            existingRoom.status = 'paused';
          }
        }
        
        // Calculate price (price per hour / 3600 = price per second)
        const pricePerHour = 50000; // Rp 50,000 per hour
        existingRoom.totalPrice = Math.ceil(existingRoom.currentDuration / 3600) * pricePerHour;
        
        console.log('[Store] Setting room:', agent.roomId, existingRoom);
        newRooms.set(agent.roomId, existingRoom);
      });
      
      return { agents, rooms: newRooms };
    });
  },
  
  updateAgent: (agent: AgentInfo) => {
    set((state) => {
      const newAgents = state.agents.filter(a => a.id !== agent.id);
      newAgents.push(agent);
      
      // Update rooms based on new agent data
      const newRooms = new Map(state.rooms);
      const existingRoom = newRooms.get(agent.roomId) || {
        roomId: agent.roomId,
        roomName: agent.roomName,
        startTime: null,
        currentDuration: 0,
        totalPrice: 0,
        status: 'idle' as const,
        isActive: false
      };
      
      // Sync isActive from agent
      existingRoom.isActive = agent.isActive ?? false;
      
      const player = agent.player;
      if (player) {
        if (player.state === 'playing') {
          if (!existingRoom.startTime) {
            existingRoom.startTime = Date.now();
          }
          existingRoom.currentDuration = existingRoom.startTime 
            ? Math.floor((Date.now() - existingRoom.startTime) / 1000)
            : 0;
          existingRoom.status = 'playing';
        } else if (player.state === 'paused') {
          existingRoom.status = 'paused';
        }
      }
      
      const pricePerHour = 50000;
      existingRoom.totalPrice = Math.ceil(existingRoom.currentDuration / 3600) * pricePerHour;
      
      newRooms.set(agent.roomId, existingRoom);
      
      return { agents: newAgents, rooms: newRooms };
    });
  },
  
  setRooms: (rooms: Room[]) => {
    set((state) => {
      const newRooms = new Map(state.rooms);
      
      rooms.forEach(room => {
        const existing = newRooms.get(room.id) || {
          roomId: room.id,
          roomName: room.name,
          startTime: null,
          currentDuration: 0,
          totalPrice: 0,
          status: 'idle' as const,
          isActive: false
        };
        
        existing.pricePerHour = room.pricePerHour;
        newRooms.set(room.id, existing);
      });
      
      return { rooms: newRooms };
    });
  },
  
  getRoomBilling: (roomId: string) => {
    return get().rooms.get(roomId);
  },
  
  activateRoom: (roomId: string) => {
    set((state) => {
      const newRooms = new Map(state.rooms);
      const room = newRooms.get(roomId);
      if (room) {
        room.isActive = true;
        room.startTime = Date.now();
        room.currentDuration = 0;
        room.status = 'idle';
        newRooms.set(roomId, room);
      }
      return { rooms: newRooms };
    });
  },
  
  deactivateRoom: (roomId: string) => {
    set((state) => {
      const newRooms = new Map(state.rooms);
      const room = newRooms.get(roomId);
      if (room) {
        room.isActive = false;
        room.status = 'idle';
        newRooms.set(roomId, room);
      }
      return { rooms: newRooms };
    });
  }
}));

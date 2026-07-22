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
}

export const useRoomStore = create<RoomStore>((set, get) => ({
  rooms: new Map(),
  agents: [],
  
  setAgents: (agents: AgentInfo[]) => {
    set((state) => {
      const newRooms = new Map(state.rooms);
      
      // Update rooms based on agent data
      agents.forEach(agent => {
        const existingRoom = newRooms.get(agent.roomId) || {
          roomId: agent.roomId,
          roomName: agent.roomName,
          startTime: null,
          currentDuration: 0,
          totalPrice: 0,
          status: 'idle' as const
        };
        
        // Calculate billing based on player state
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
        
        // Calculate price (price per hour / 3600 = price per second)
        const pricePerHour = 50000; // Rp 50,000 per hour
        existingRoom.totalPrice = Math.ceil(existingRoom.currentDuration / 3600) * pricePerHour;
        
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
        status: 'idle' as const
      };
      
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
          status: 'idle' as const
        };
        
        existing.pricePerHour = room.pricePerHour;
        newRooms.set(room.id, existing);
      });
      
      return { rooms: newRooms };
    });
  },
  
  getRoomBilling: (roomId: string) => {
    return get().rooms.get(roomId);
  }
}));

import type { AgentState } from "../types/app/AgentState";
import type { PlayerState } from "../types/app/PlayerState";
import type { PlaylistState } from "../types/app/PlaylistState";

type AgentUpdateCallback = (agent: AgentState) => void;
type PlayerUpdateCallback = (player: PlayerState) => void;
type PlaylistUpdateCallback = (playlist: PlaylistState) => void;

const initialAgent: AgentState = {
  id: "",
  name: "",
  online: false,
  lastHeartbeat: 0,
  isActive: false,
  expiresAt: null,
};

const initialPlayer: PlayerState = {
  playing: false,
  currentTime: 0,
  duration: 0,
  volume: 50,
  muted: false,
  fullscreen: false,
};

const initialPlaylist: PlaylistState = {
  items: [],
  currentIndex: -1,
  repeat: "OFF",
  shuffle: false,
};

// Owns agent/player/playlist state - all three are socket-pushed data written
// by plain listener classes (PlayerStateListener, registerPlaylistListener,
// useAgent) instantiated/run before React ever renders, so this is a plain
// singleton with pub/sub (mirrors cashier's MultiSocketService), not a
// React Context - Context has no imperative write path for callers outside
// a component.
class AppStateService {
  private agent: AgentState = initialAgent;
  private player: PlayerState = initialPlayer;
  private playlist: PlaylistState = initialPlaylist;

  private agentCallbacks: AgentUpdateCallback[] = [];
  private playerCallbacks: PlayerUpdateCallback[] = [];
  private playlistCallbacks: PlaylistUpdateCallback[] = [];

  getAgent(): AgentState {
    return this.agent;
  }

  getPlayer(): PlayerState {
    return this.player;
  }

  getPlaylist(): PlaylistState {
    return this.playlist;
  }

  setAgent(value: AgentState): void {
    this.agent = value;
    this.agentCallbacks.forEach((cb) => cb(this.agent));
  }

  setPlayer(value: Partial<PlayerState>): void {
    this.player = { ...this.player, ...value };
    this.playerCallbacks.forEach((cb) => cb(this.player));
  }

  setPlaylist(value: PlaylistState): void {
    this.playlist = value;
    this.playlistCallbacks.forEach((cb) => cb(this.playlist));
  }

  onAgentUpdate(callback: AgentUpdateCallback): () => void {
    this.agentCallbacks.push(callback);
    return () => {
      this.agentCallbacks = this.agentCallbacks.filter((cb) => cb !== callback);
    };
  }

  onPlayerUpdate(callback: PlayerUpdateCallback): () => void {
    this.playerCallbacks.push(callback);
    return () => {
      this.playerCallbacks = this.playerCallbacks.filter((cb) => cb !== callback);
    };
  }

  onPlaylistUpdate(callback: PlaylistUpdateCallback): () => void {
    this.playlistCallbacks.push(callback);
    return () => {
      this.playlistCallbacks = this.playlistCallbacks.filter((cb) => cb !== callback);
    };
  }
}

export const appStateService = new AppStateService();

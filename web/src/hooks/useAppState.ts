import { useEffect, useState } from "react";

import { appStateService } from "../services/AppStateService";
import type { AgentState } from "../types/app/AgentState";
import type { PlayerState } from "../types/app/PlayerState";
import type { PlaylistState } from "../types/app/PlaylistState";

export function useAgentState(): AgentState {
  const [agent, setAgent] = useState<AgentState>(() => appStateService.getAgent());
  useEffect(() => appStateService.onAgentUpdate(setAgent), []);
  return agent;
}

export function usePlayerState(): PlayerState {
  const [player, setPlayer] = useState<PlayerState>(() => appStateService.getPlayer());
  useEffect(() => appStateService.onPlayerUpdate(setPlayer), []);
  return player;
}

export function usePlaylistState(): PlaylistState {
  const [playlist, setPlaylist] = useState<PlaylistState>(() => appStateService.getPlaylist());
  useEffect(() => appStateService.onPlaylistUpdate(setPlaylist), []);
  return playlist;
}

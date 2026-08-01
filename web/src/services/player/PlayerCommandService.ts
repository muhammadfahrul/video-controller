import { socketService } from "../socket";
import type { PlayerCommand } from "./PlayerCommand";
import type { PlaylistItem } from "../../features/playlist/types/PlaylistItem";

export class PlayerCommandService {
    private emit(command: PlayerCommand): void {
        socketService.emit("player:command", command);
    }

    play(agentId: string): void {
        this.emit({ agentId, type: "PLAY" });
    }

    pause(agentId: string): void {
        this.emit({ agentId, type: "PAUSE" });
    }

    stop(agentId: string): void {
        this.emit({ agentId, type: "STOP" });
    }

    next(agentId: string): void {
        this.emit({ agentId, type: "NEXT" });
    }

    previous(agentId: string): void {
        this.emit({ agentId, type: "PREVIOUS" });
    }

    fullscreen(agentId: string): void {
        this.emit({ agentId, type: "FULLSCREEN" });
    }

    exitFullscreen(agentId: string): void {
        this.emit({ agentId, type: "EXIT_FULLSCREEN" });
    }

    volume(agentId: string, volume: number): void {
        this.emit({ agentId, type: "VOLUME", volume });
    }

    seek(agentId: string, second: number): void {
        this.emit({ agentId, type: "SEEK", seek: second });
    }

    openVideo(agentId: string, videoId: string): void {
        this.emit({ agentId, type: "OPEN_VIDEO", videoId });
    }

    addPlaylist(agentId: string, item: PlaylistItem): void {
        this.emit({ agentId, type: "ADD_PLAYLIST", item });
    }

    mute(agentId: string): void {
        this.emit({ agentId, type: "MUTE" });
    }

    unmute(agentId: string): void {
        this.emit({ agentId, type: "UNMUTE" });
    }

    playPlaylistItem(agentId: string, playlistId: string): void {
        this.emit({ agentId, type: "PLAY_PLAYLIST_ITEM", id: playlistId });
    }

    removePlaylist(agentId: string, playlistId: string): void {
        this.emit({ agentId, type: "REMOVE_PLAYLIST", id: playlistId });
    }

    clearPlaylist(agentId: string): void {
        this.emit({ agentId, type: "CLEAR_PLAYLIST" });
    }

    shufflePlaylist(agentId: string): void {
        this.emit({ agentId, type: "SHUFFLE_PLAYLIST" });
    }

    repeat(agentId: string, mode: string): void {
        this.emit({ agentId, type: "REPEAT_" + mode });
    }

    skipAd(agentId: string): void {
        this.emit({ agentId, type: "SKIP_AD" });
    }

    atmosphere(agentId: string): void {
        this.emit({ agentId, type: "ATMOSPHERE" });
    }
}

export const playerCommandService = new PlayerCommandService();

import { socketService } from "../socket";
import { useAppStore } from "../../store/appStore";
import type { PlayerState } from "../../types/app/PlayerState";
import type { PlaylistState } from "../../types/app/PlaylistState";

export class PlayerStateListener {

    start() {
        // Fix #6: player:state and player:update had identical handlers — consolidated to one function (DRY)
        const handlePlayerState = (payload: { player: PlayerState; playlist?: PlaylistState }) => {
            if (!payload.player) return;

            useAppStore.getState().setPlayer({
                playing: payload.player.playing,
                currentTime: payload.player.currentTime,
                duration: payload.player.duration,
                volume: payload.player.volume,
                muted: payload.player.muted,
                fullscreen: payload.player.fullscreen,
                videoId: payload.player.videoId,
                title: payload.player.title,
                channel: payload.player.channel,
                thumbnail: payload.player.thumbnail,
            });

            if (payload.playlist) {
                useAppStore.getState().setPlaylist(payload.playlist);
            }
        };

        // Both events use the same handler
        socketService.on("player:state", handlePlayerState);
        socketService.on("player:update", handlePlayerState);
    }

}

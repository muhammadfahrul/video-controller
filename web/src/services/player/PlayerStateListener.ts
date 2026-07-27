import { socketService } from "../socket";
import { useAppStore } from "../../store/appStore";
import type { PlayerState } from "../../types/app/PlayerState";

export class PlayerStateListener {
    start() {
        // Listen to player:state for initial player state
        socketService.on(
            "player:state",
            (payload: { player: PlayerState }) => {
                console.log("[PWA] Player State", payload);

                const { player } = payload;

                if (!player) {
                    return;
                }

                useAppStore.getState().setPlayer({
                    playing: player.playing,
                    currentTime: player.currentTime,
                    duration: player.duration,
                    volume: player.volume,
                    muted: player.muted,
                    fullscreen: player.fullscreen,
                    videoId: player.videoId,
                    title: player.title,
                    channel: player.channel,
                    thumbnail: player.thumbnail
                });

                console.log("[PlayerStateListener] Updated from player:state");
            }
        );

        // Also listen to player:update for real-time updates
        socketService.on(
            "player:update",
            (payload: { player: PlayerState }) => {
                console.log("[PWA] Player Update", payload);

                const { player } = payload;

                if (!player) {
                    return;
                }

                useAppStore.getState().setPlayer({
                    playing: player.playing,
                    currentTime: player.currentTime,
                    duration: player.duration,
                    volume: player.volume,
                    muted: player.muted,
                    fullscreen: player.fullscreen,
                    videoId: player.videoId,
                    title: player.title,
                    channel: player.channel,
                    thumbnail: player.thumbnail
                });

                console.log("[PlayerStateListener] Updated from player:update");
            }
        );
    }
}

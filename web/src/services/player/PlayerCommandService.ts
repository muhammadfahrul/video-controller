import {

    socketService

} from "../socket";

import type {

    PlayerCommand

} from "./PlayerCommand";

import type {

    PlaylistItem

} from "../../features/playlist/types/PlaylistItem";

type CommandCallback = {
    onSuccess?: () => void;
    onError?: (error: string) => void;
};

export class PlayerCommandService {

    private emit(

        command: PlayerCommand,
        callbacks?: CommandCallback

    ): void {

        console.log(

            "[PlayerCommand]",

            command

        );

        // Check if socket is connected before emitting
        if (!socketService.isConnected()) {
            console.error("[PlayerCommand] Socket not connected");
            callbacks?.onError?.("Socket not connected");
            return;
        }

        socketService.emit(

            "player:command",

            command

        );

        // Call success callback immediately (actual confirmation will come from server)
        callbacks?.onSuccess?.();

    }

    play(

        agentId: string,
        callbacks?: CommandCallback

    ): void {

        this.emit({

            agentId,

            type: "PLAY"

        }, callbacks);

    }

    pause(

        agentId: string,
        callbacks?: CommandCallback

    ): void {

        this.emit({

            agentId,

            type: "PAUSE"

        }, callbacks);

    }

    stop(

        agentId: string,
        callbacks?: CommandCallback

    ): void {

        this.emit({

            agentId,

            type: "STOP"

        }, callbacks);

    }

    next(

        agentId: string,
        callbacks?: CommandCallback

    ): void {

        this.emit({

            agentId,

            type: "NEXT"

        }, callbacks);

    }

    previous(

        agentId: string,
        callbacks?: CommandCallback

    ): void {

        this.emit({

            agentId,

            type: "PREVIOUS"

        }, callbacks);

    }

    fullscreen(

        agentId: string,
        callbacks?: CommandCallback

    ): void {

        this.emit({

            agentId,

            type: "FULLSCREEN"

        }, callbacks);

    }

    exitFullscreen(
        agentId: string,
        callbacks?: CommandCallback
    ) {

        this.emit({

            agentId,

            type: "EXIT_FULLSCREEN"

        }, callbacks);

    }

    toggleFullscreen(
        agentId: string,
        callbacks?: CommandCallback
    ) {
        this.emit({
            agentId,
            type: "TOGGLE_FULLSCREEN"
        }, callbacks);
    }

    volume(

        agentId: string,

        volume: number,
        callbacks?: CommandCallback

    ): void {

        this.emit({

            agentId,

            type: "VOLUME",

            volume

        }, callbacks);

    }

    setVolume(
        agentId: string,
        volume: number,
        callbacks?: CommandCallback
    ): void {
        this.volume(agentId, volume, callbacks);
    }

    toggleMute(
        agentId: string,
        callbacks?: CommandCallback
    ): void {
        this.emit({
            agentId,
            type: "TOGGLE_MUTE"
        }, callbacks);
    }

    seek(

        agentId: string,

        second: number,
        callbacks?: CommandCallback

    ): void {

        this.emit({

            agentId,

            type: "SEEK",

            seek: second

        }, callbacks);

    }

    openVideo(

        agentId: string,

        videoId: string,
        callbacks?: CommandCallback

    ): void {

        this.emit({

            agentId,

            type: "OPEN_VIDEO",

            videoId

        }, callbacks);

    }

    addPlaylist(

        agentId: string,

        item: PlaylistItem,
        callbacks?: CommandCallback

    ): void {

        this.emit({

            agentId,

            type: "ADD_PLAYLIST",

            item

        }, callbacks);

    }

    mute(
        agentId: string,
        callbacks?: CommandCallback
    ) {

        this.emit({

            agentId,

            type: "MUTE"

        }, callbacks);

    }

    unmute(
        agentId: string,
        callbacks?: CommandCallback
    ) {

        this.emit({

            agentId,

            type: "UNMUTE"

        }, callbacks);

    }

    playPlaylistItem(

        agentId:string,

        playlistId:string,
        callbacks?: CommandCallback

    ){

        this.emit({

            agentId,

            type:"PLAY_PLAYLIST_ITEM",

            id:playlistId

        }, callbacks);

    }



    removePlaylist(

        agentId:string,

        playlistId:string,
        callbacks?: CommandCallback

    ){

        this.emit({

            agentId,

            type:"REMOVE_PLAYLIST",

            id:playlistId

        }, callbacks);

    }



    clearPlaylist(

        agentId:string,
        callbacks?: CommandCallback

    ){

        this.emit({

            agentId,

            type:"CLEAR_PLAYLIST"

        }, callbacks);

    }



    shufflePlaylist(

        agentId:string,
        callbacks?: CommandCallback

    ){

        this.emit({

            agentId,

            type:"SHUFFLE_PLAYLIST"

        }, callbacks);

    }



    repeat(

        agentId:string,

        mode:string,
        callbacks?: CommandCallback

    ){

        this.emit({

            agentId,

            type:"REPEAT_" + mode

        }, callbacks);

    }

    skipAd(
        agentId:string,
        callbacks?: CommandCallback
    ){
        this.emit({
            agentId,
            type:"SKIP_AD"
        }, callbacks);
    }

    atmosphere(
        agentId: string,
        callbacks?: CommandCallback
    ): void {
        console.log("[PlayerCommandService] emit ATMOSPHERE", agentId);
        this.emit({ agentId, type: "ATMOSPHERE" }, callbacks);
    }
}

export const playerCommandService =

    new PlayerCommandService();
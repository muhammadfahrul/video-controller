import { Page } from "playwright";

import {
    YouTubePlayer
} from "../player";

import {

    PlayerSnapshot

} from "../types/PlayerSnapshot";
import { PlayerRepository } from "../repositories/PlayerRepository";

export class PlayerService {


    private player:
        YouTubePlayer;

    private restoredSnapshot?: PlayerSnapshot;

    private lastHealthySnapshot?: PlayerSnapshot;

    private restoring = false;

    private onEnded?: () => void;



    constructor(
        page:Page,
        private readonly repository: PlayerRepository
    ){

        this.player =
            new YouTubePlayer(page);

    }



    getPlayer(){

        return this.player;

    }

    private isHealthySnapshot(
        snapshot: PlayerSnapshot
    ): boolean {

        return (
            !!snapshot.videoId &&
            Number.isFinite(snapshot.currentTime) &&
            Number.isFinite(snapshot.duration) &&
            snapshot.duration > 0 &&
            snapshot.currentTime >= 0 &&
            Number.isFinite(snapshot.volume)
        );

    }


    private async persist() {

        if (this.restoring) {

            return;

        }

        const snapshot =

            await this.getSnapshot();

        await this.repository.save({

            player: snapshot

        });

    }



    async open(
        videoId:string
    ){

        await this.player.open(videoId);

        await this.persist();

    }

    public async openVideo(
        videoId: string
    ) {

        await this.open(
            videoId
        );

        await this.play();

    }


    async play(){

        console.log(

            "[PLAYER] play()"

        );
        
        await this.player.play();

        await this.persist();

    }



    async pause(){

        await this.player.pause();

        await this.persist();

    }



    async volume(
        value:number
    ){

        await this.setVolume(value);

    }

    async setVolume(
        value:number
    ){

        console.log(
            "PlayerService.setVolume",
            value
        );
        
        await this.player.setVolume(value);

        await this.persist();

    }

    public async seek(
        seconds: number
    ) {

        await this.player.seek(
            seconds
        );

        await this.persist();

    }

    public async mute() {

        await this.player.mute();

        await this.persist();

    }

    public async unmute() {

        await this.player.unmute();

        await this.persist();

    }

    public async stop() {

        await this.player.stop();

        await this.persist();

    }

    public async fullscreen() {

        console.log(
            "PlayerService.fullscreen"
        );

        await this.player.fullscreen();

        await this.persist();

    }

    public async exitFullscreen() {

        await this.player.exitFullscreen();

        await this.persist();

    }

    public async toggleFullscreen() {

        await this.player.toggleFullscreen();

        await this.persist();

    }

    public async getSnapshot(): Promise<PlayerSnapshot> {

        const snapshot =
            await this.player.getSnapshot();

        if (this.isHealthySnapshot(snapshot)) {

            this.lastHealthySnapshot = snapshot;

            return snapshot;

        }

        console.warn(
            "[PLAYER] Invalid snapshot, using last healthy snapshot."
        );

        if (this.lastHealthySnapshot) {

            return this.lastHealthySnapshot;

        }

        return snapshot;

    }

    public setOnEnded(
        callback:()=>void
    ){

        this.onEnded =
            callback;

        this.player.setOnEnded(
            callback
        );

    }

    public async loadSnapshot() {

        const data =

            await this.repository.load();

        this.restoredSnapshot =
            data.player;

        this.lastHealthySnapshot =
            data.player;

        return this.restoredSnapshot;

    }

    public getRestoredSnapshot() {

        return this.restoredSnapshot;

    }

    public async restoreLastVideo() {

        const snapshot =

            this.getRestoredSnapshot();

        if (

            !snapshot ||

            !snapshot.videoId

        ) {

            return false;

        }

        this.restoring = true;

        try {

            await this.open(

                snapshot.videoId

            );

        }

        finally {

            this.restoring = false;

        }

        return true;

    }

    public isRestoring() {

        return this.restoring;

    }

    public async restorePosition() {

        const snapshot =

            this.getRestoredSnapshot();

        if (

            !snapshot ||

            snapshot.currentTime <= 0

        ) {

            return;

        }

        console.log(

            "[PLAYER] Restore position",

            snapshot.currentTime

        );

        await this.seek(

            snapshot.currentTime

        );

    }

    public async restorePlaybackState() {

        const snapshot =

            this.getRestoredSnapshot();

        if (!snapshot) {

            return;

        }

        if (snapshot.playing) {

            console.log(

                "[PLAYER] Restore playback"

            );

            await this.play();

        }

    }


    public async restoreVolume() {

        const snapshot =

            this.getRestoredSnapshot();

        if (!snapshot) {

            return;

        }

        await this.setVolume(

            snapshot.volume

        );

    }


    public async restoreMute() {

        const snapshot =

            this.getRestoredSnapshot();

        if (!snapshot) {

            return;

        }

        if (snapshot.muted) {

            await this.mute();

        } else {

            await this.unmute();

        }

    }


    public async restore() {

        this.restoring = true;

        try {

            await this.restoreLastVideo();

            await this.restorePosition();

            await this.restoreVolume();

            await this.restoreMute();

            await this.restorePlaybackState();

        }

        finally {

            this.restoring = false;

        }

    }

    public async getVideoSnapshot() {

        return this.player
            .getVideoSnapshot();

    }

    public async waitUntilReady(): Promise<void> {

        await this.player.waitUntilReady();

    }

    public async isFullscreen(): Promise<boolean> {

        return await this.player.isFullscreen();

    }

    public getLastHealthySnapshot() {

        return this.lastHealthySnapshot;

    }
}
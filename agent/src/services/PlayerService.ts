import { Page } from "playwright";
import path from "path";

import {
    YouTubePlayer
} from "../player";

import {

    PlayerSnapshot

} from "../types/PlayerSnapshot";
import { PlayerRepository } from "../repositories/PlayerRepository";

export class PlayerService {


    private player!:
        YouTubePlayer;

    private repository?: PlayerRepository;

    private restoredSnapshot?: PlayerSnapshot;

    private lastHealthySnapshot?: PlayerSnapshot;
    private lastHealthySnapshotAt?: number;

    // Max age the last-healthy fallback may be served for. Long enough to
    // smooth a real transient glitch (e.g. duration briefly reporting 0
    // during an ad transition), short enough that a persistently stuck
    // player doesn't silently feed indefinitely stale data into the 1s
    // server-facing state-sync stream.
    private static readonly HEALTHY_SNAPSHOT_MAX_AGE_MS = 5000;

    private restoring = false;

    private clearing = false;

    private onEnded?: () => void;



    constructor(
        page?: Page,
        repository?: PlayerRepository
    ){

        if (page) {
            this.player = new YouTubePlayer(page);
        }

        if (repository) {
            this.repository = repository;
        }

    }



    getPlayer(){

        return this.player;

    }

    async clearData() {
        this.clearing = true;
        
        // Clear storage data
        await this.repository?.clear();
        
        // Clear in-memory state
        this.restoredSnapshot = undefined;
        this.lastHealthySnapshot = undefined;
        this.lastHealthySnapshotAt = undefined;
        
        console.log("[PlayerService] All player state cleared");
        
        // Do NOT set clearing to false here!
        // Keep clearing = true to prevent sending invalid snapshots
        // until a new valid video is loaded
    }
    
    // Call this when a new valid video is loaded
    public endClearing(): void {
        this.clearing = false;
        console.log("[PlayerService] Clearing mode ended");
    }

    // Restore player state from server database
    public async restoreState(playerState: {
        playing?: boolean;
        currentTime?: number;
        duration?: number;
        volume?: number;
        muted?: boolean;
        fullscreen?: boolean;
        videoId?: string;
        title?: string;
    }): Promise<void> {
        console.log("[PlayerService] Restoring player state from server:", playerState);
        
        if (!playerState || !playerState.videoId) {
            console.log("[PlayerService] No valid player state to restore");
            return;
        }

        try {
            // Store the restored state
            this.restoredSnapshot = {
                videoId: playerState.videoId,
                title: playerState.title,
                currentTime: playerState.currentTime || 0,
                duration: playerState.duration || 0,
                playing: playerState.playing || false,
                volume: playerState.volume || 100,
                muted: playerState.muted || false,
                fullscreen: playerState.fullscreen || false
            };
            
            // Open the video but don't auto-play yet
            await this.player.open(playerState.videoId);
            
            console.log("[PlayerService] Player state restored successfully");
        } catch (error) {
            console.error("[PlayerService] Error restoring player state:", error);
        }
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

        if (this.restoring || this.clearing) {

            return;

        }

        const snapshot =

            await this.getSnapshot();

        await this.repository?.save({

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

        // If empty videoId, navigate to YouTube home
        if (!videoId) {
            await this.player.openHome();
            await this.fullscreen();
            return;
        }

        await this.open(
            videoId
        );

        await this.play();

        await this.fullscreen();
        
        // End clearing mode since we have a valid video now
        this.endClearing();

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

    public async skipAd(): Promise<boolean> {

        return await this.player.skipAd();

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

        // If clearing, return empty state to prevent old data from being sent
        if (this.clearing) {
            return {
                playing: false,
                currentTime: 0,
                duration: 0,
                volume: 100,
                muted: false,
                fullscreen: false,
                videoId: undefined,
                title: undefined,
                channel: undefined,
                thumbnail: undefined
            };
        }

        const snapshot =
            await this.player.getSnapshot();

        if (this.isHealthySnapshot(snapshot)) {

            this.lastHealthySnapshot = snapshot;
            this.lastHealthySnapshotAt = Date.now();

            return snapshot;

        }

        const fallbackAge =
            this.lastHealthySnapshotAt
                ? Date.now() - this.lastHealthySnapshotAt
                : undefined;

        if (
            this.lastHealthySnapshot &&
            fallbackAge !== undefined &&
            fallbackAge <= PlayerService.HEALTHY_SNAPSHOT_MAX_AGE_MS
        ) {

            console.warn(
                `[PLAYER] Invalid snapshot, using last healthy snapshot (age ${fallbackAge}ms).`
            );

            return { ...this.lastHealthySnapshot, isFallbackSnapshot: true };

        }

        console.warn(
            "[PLAYER] Invalid snapshot and no recent healthy snapshot to fall back to; returning raw snapshot."
        );

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

            await this.repository?.load();

        if (data) {
            this.restoredSnapshot = data.player;
            this.lastHealthySnapshot = data.player;
        }

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

        // Skip if player is not ready (no video loaded)
        if (
            this.player.getState() === "IDLE" ||
            this.player.getState() === "LOADING"
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

        // Skip if player is not ready (no video loaded)
        if (
            this.player.getState() === "IDLE" ||
            this.player.getState() === "LOADING"
        ) {

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

        // Skip if player is not ready (no video loaded)
        if (
            this.player.getState() === "IDLE" ||
            this.player.getState() === "LOADING"
        ) {

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

        // Skip if player is not ready (no video loaded)
        if (
            this.player.getState() === "IDLE" ||
            this.player.getState() === "LOADING"
        ) {

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


    /**
     * Show start image when room is activated.
     * Uses the HTML file from agent/data/start_image.html (fullscreen)
     */
    public async showStartImage(): Promise<void> {
        const dataPath = path.join(process.cwd(), "data");
        const startImagePath = path.join(dataPath, "start_image.html");
        
        await this.showImage(startImagePath);
    }

    /**
     * Show expired image when room time is expired/deactivated.
     * Uses the HTML file from agent/data/expired_image.html (fullscreen)
     */
    public async showExpiredImage(): Promise<void> {
        const dataPath = path.join(process.cwd(), "data");
        const expiredImagePath = path.join(dataPath, "expired_image.html");
        
        await this.showImage(expiredImagePath);
    }

    /**
     * Display an image in the browser page.
     */
    private async showImage(imagePath: string): Promise<void> {
        const fs = await import("fs");
        if (!fs.existsSync(imagePath)) {
            console.warn(`[PlayerService] Image file not found: ${imagePath}`);
            return;
        }

        // Convert to file:// URL
        const fileUrl = `file://${imagePath}`;
        
        await this.player.goto(fileUrl);
        console.log(`[PlayerService] Displayed image: ${imagePath}`);
    }
}
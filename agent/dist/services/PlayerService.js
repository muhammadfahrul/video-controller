"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlayerService = void 0;
const player_1 = require("../player");
class PlayerService {
    player;
    repository;
    restoredSnapshot;
    lastHealthySnapshot;
    restoring = false;
    onEnded;
    constructor(page, repository) {
        if (page) {
            this.player = new player_1.YouTubePlayer(page);
        }
        if (repository) {
            this.repository = repository;
        }
    }
    getPlayer() {
        return this.player;
    }
    isHealthySnapshot(snapshot) {
        return (!!snapshot.videoId &&
            Number.isFinite(snapshot.currentTime) &&
            Number.isFinite(snapshot.duration) &&
            snapshot.duration > 0 &&
            snapshot.currentTime >= 0 &&
            Number.isFinite(snapshot.volume));
    }
    async persist() {
        if (this.restoring) {
            return;
        }
        const snapshot = await this.getSnapshot();
        await this.repository?.save({
            player: snapshot
        });
    }
    async open(videoId) {
        await this.player.open(videoId);
        await this.persist();
    }
    async openVideo(videoId) {
        // If empty videoId, navigate to YouTube home
        if (!videoId) {
            await this.player.openHome();
            await this.fullscreen();
            return;
        }
        await this.open(videoId);
        await this.play();
        await this.fullscreen();
    }
    async play() {
        console.log("[PLAYER] play()");
        await this.player.play();
        await this.persist();
    }
    async pause() {
        await this.player.pause();
        await this.persist();
    }
    async volume(value) {
        await this.setVolume(value);
    }
    async setVolume(value) {
        console.log("PlayerService.setVolume", value);
        await this.player.setVolume(value);
        await this.persist();
    }
    async seek(seconds) {
        await this.player.seek(seconds);
        await this.persist();
    }
    async skipAd() {
        return await this.player.skipAd();
    }
    async mute() {
        await this.player.mute();
        await this.persist();
    }
    async unmute() {
        await this.player.unmute();
        await this.persist();
    }
    async stop() {
        await this.player.stop();
        await this.persist();
    }
    async fullscreen() {
        console.log("PlayerService.fullscreen");
        await this.player.fullscreen();
        await this.persist();
    }
    async exitFullscreen() {
        await this.player.exitFullscreen();
        await this.persist();
    }
    async toggleFullscreen() {
        await this.player.toggleFullscreen();
        await this.persist();
    }
    async getSnapshot() {
        const snapshot = await this.player.getSnapshot();
        if (this.isHealthySnapshot(snapshot)) {
            this.lastHealthySnapshot = snapshot;
            return snapshot;
        }
        console.warn("[PLAYER] Invalid snapshot, using last healthy snapshot.");
        if (this.lastHealthySnapshot) {
            return this.lastHealthySnapshot;
        }
        return snapshot;
    }
    setOnEnded(callback) {
        this.onEnded =
            callback;
        this.player.setOnEnded(callback);
    }
    async loadSnapshot() {
        const data = await this.repository?.load();
        if (data) {
            this.restoredSnapshot = data.player;
            this.lastHealthySnapshot = data.player;
        }
        return this.restoredSnapshot;
    }
    getRestoredSnapshot() {
        return this.restoredSnapshot;
    }
    async restoreLastVideo() {
        const snapshot = this.getRestoredSnapshot();
        if (!snapshot ||
            !snapshot.videoId) {
            return false;
        }
        this.restoring = true;
        try {
            await this.open(snapshot.videoId);
        }
        finally {
            this.restoring = false;
        }
        return true;
    }
    isRestoring() {
        return this.restoring;
    }
    async restorePosition() {
        const snapshot = this.getRestoredSnapshot();
        if (!snapshot ||
            snapshot.currentTime <= 0) {
            return;
        }
        // Skip if player is not ready (no video loaded)
        if (this.player.getState() === "IDLE" ||
            this.player.getState() === "LOADING") {
            return;
        }
        console.log("[PLAYER] Restore position", snapshot.currentTime);
        await this.seek(snapshot.currentTime);
    }
    async restorePlaybackState() {
        const snapshot = this.getRestoredSnapshot();
        if (!snapshot) {
            return;
        }
        // Skip if player is not ready (no video loaded)
        if (this.player.getState() === "IDLE" ||
            this.player.getState() === "LOADING") {
            return;
        }
        if (snapshot.playing) {
            console.log("[PLAYER] Restore playback");
            await this.play();
        }
    }
    async restoreVolume() {
        const snapshot = this.getRestoredSnapshot();
        if (!snapshot) {
            return;
        }
        // Skip if player is not ready (no video loaded)
        if (this.player.getState() === "IDLE" ||
            this.player.getState() === "LOADING") {
            return;
        }
        await this.setVolume(snapshot.volume);
    }
    async restoreMute() {
        const snapshot = this.getRestoredSnapshot();
        if (!snapshot) {
            return;
        }
        // Skip if player is not ready (no video loaded)
        if (this.player.getState() === "IDLE" ||
            this.player.getState() === "LOADING") {
            return;
        }
        if (snapshot.muted) {
            await this.mute();
        }
        else {
            await this.unmute();
        }
    }
    async restore() {
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
    async getVideoSnapshot() {
        return this.player
            .getVideoSnapshot();
    }
    async waitUntilReady() {
        await this.player.waitUntilReady();
    }
    async isFullscreen() {
        return await this.player.isFullscreen();
    }
    getLastHealthySnapshot() {
        return this.lastHealthySnapshot;
    }
}
exports.PlayerService = PlayerService;

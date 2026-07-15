"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.YouTubePlayer = void 0;
const YouTubeDOM_1 = require("./YouTubeDOM");
const PlayerState_1 = require("./PlayerState");
const LoggerService_1 = require("../services/LoggerService");
const PlayerEventListener_1 = require("./PlayerEventListener");
class YouTubePlayer {
    page;
    dom;
    eventListener;
    state = PlayerState_1.PlayerState.IDLE;
    onEnded;
    navigating = false;
    endedFunctionRegistered = false;
    endedListenerInitialized = false;
    constructor(page) {
        this.page = page;
        this.dom =
            new YouTubeDOM_1.YouTubeDOM(page);
        this.eventListener =
            new PlayerEventListener_1.PlayerEventListener();
    }
    async open(videoId) {
        this.navigating = true;
        try {
            this.state = PlayerState_1.PlayerState.LOADING;
            LoggerService_1.LoggerService.info(`Opening YouTube video ${videoId}`);
            // Add stealth script before navigation
            await this.page.addInitScript(() => {
                // Override navigator.webdriver
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => undefined
                });
                // Override permissions
                const originalQuery = window.navigator.permissions.query;
                window.navigator.permissions.query = (parameters) => (parameters.name === 'notifications' ?
                    Promise.resolve({ state: Notification.permission }) :
                    originalQuery(parameters));
                // Prevent detection
                window.navigator.chrome = true;
            });
            await this.page.goto(`https://www.youtube.com/watch?v=${videoId}`, {
                waitUntil: "domcontentloaded"
            });
            // Wait a bit for player to initialize
            await this.page.waitForTimeout(2000);
            await this.dom.waitUntilReady();
            await this.setupEndedListener();
            await this.attachEvents();
            this.state = PlayerState_1.PlayerState.READY;
            LoggerService_1.LoggerService.info("YouTube player ready.");
        }
        finally {
            this.navigating = false;
        }
    }
    async play() {
        this.ensureReady();
        console.log("[YouTube] play()");
        await this.dom.play();
        this.state = PlayerState_1.PlayerState.PLAYING;
    }
    async pause() {
        this.ensureReady();
        await this.dom.pause();
        this.state = PlayerState_1.PlayerState.PAUSED;
    }
    async setVolume(volume) {
        this.ensureReady();
        console.log("YouTubePlayer.setVolume", volume);
        await this.dom.setVolume(volume);
    }
    async getStatus() {
        console.log("Calling page.evaluate");
        const status = await this.page.evaluate(() => {
            const video = document.querySelector("video");
            const title = document.querySelector("h1")?.textContent ?? null;
            return {
                videoId: new URL(location.href)
                    .searchParams
                    .get("v"),
                title,
                duration: video?.duration ?? 0,
                currentTime: video?.currentTime ?? 0,
                volume: video
                    ? Math.round(video.volume * 100)
                    : 0,
                muted: video?.muted ?? false,
                isPlaying: video
                    ? !video.paused
                    : false
            };
        });
        return {
            state: status.isPlaying
                ? PlayerState_1.PlayerState.PLAYING
                : PlayerState_1.PlayerState.PAUSED,
            videoId: status.videoId,
            title: status.title,
            duration: status.duration,
            currentTime: status.currentTime,
            volume: status.volume,
            muted: status.muted
        };
    }
    getState() {
        return this.state;
    }
    async seek(seconds) {
        this.ensureReady();
        await this.dom.seek(seconds);
    }
    async mute() {
        this.ensureReady();
        await this.dom.mute();
    }
    async unmute() {
        this.ensureReady();
        await this.dom.unmute();
    }
    async stop() {
        this.ensureReady();
        await this.dom.stop();
    }
    async fullscreen() {
        this.ensureReady();
        console.log("YouTubePlayer.fullscreen");
        await this.dom.fullscreen();
    }
    async exitFullscreen() {
        this.ensureReady();
        await this.dom.exitFullscreen();
    }
    async toggleFullscreen() {
        this.ensureReady();
        await this.dom.toggleFullscreen();
    }
    async isFullscreen() {
        this.ensureReady();
        return await this.dom.isFullscreen();
    }
    async onEvent(callback) {
        this.eventListener
            .setCallback(callback);
        await this.attachEvents();
    }
    async attachEvents() {
        await this.dom.listenEvents(async (payload) => {
            await this.eventListener.handle(payload);
        });
    }
    async getSnapshot() {
        if (this.navigating) {
            return {
                playing: false,
                currentTime: 0,
                duration: 0,
                volume: 0,
                muted: false,
                fullscreen: false,
                videoId: undefined
            };
        }
        try {
            return await this.page.evaluate(() => {
                const player = document.querySelector(".html5-video-player");
                const video = document.querySelector("video");
                const playing = !!video &&
                    !video.paused &&
                    !video.ended;
                const currentTime = video?.currentTime ?? 0;
                const duration = video?.duration ?? 0;
                const muted = video?.muted ?? false;
                const volume = Math.round((video?.volume ?? 0) * 100);
                const fullscreen = !!document.fullscreenElement;
                const url = window.location.href;
                const match = url.match(/[?&]v=([^&]+)/i);
                const videoId = match?.[1];
                return {
                    playing,
                    currentTime,
                    duration,
                    volume,
                    muted,
                    fullscreen,
                    videoId
                };
            });
        }
        catch (error) {
            console.warn("[PLAYER] Snapshot skipped", error);
            return {
                playing: false,
                currentTime: 0,
                duration: 0,
                volume: 0,
                muted: false,
                fullscreen: false,
                videoId: undefined
            };
        }
    }
    setOnEnded(callback) {
        this.onEnded =
            callback;
    }
    async setupEndedListener() {
        if (this.endedListenerInitialized) {
            return;
        }
        await this.page.exposeFunction("youtubeEnded", () => {
            console.log("[YOUTUBE] ended");
            this.onEnded?.();
        });
        await this.page.waitForSelector("video");
        await this.page.evaluate(() => {
            const video = document.querySelector("video");
            if (!video) {
                return;
            }
            if (video.dataset.endedAttached === "true") {
                return;
            }
            video.dataset.endedAttached = "true";
            video.addEventListener("ended", () => {
                // @ts-ignore
                window.youtubeEnded();
            });
        });
        this.endedListenerInitialized = true;
    }
    ensureReady() {
        if (this.navigating) {
            throw new Error("Player is navigating.");
        }
    }
    async getVideoSnapshot() {
        return this.dom.getVideoSnapshot();
    }
    async waitUntilReady() {
        await this.dom.waitUntilReady();
    }
}
exports.YouTubePlayer = YouTubePlayer;

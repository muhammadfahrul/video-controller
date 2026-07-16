"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.YouTubePlayer = void 0;
const YouTubeDOM_1 = require("./YouTubeDOM");
const PlayerState_1 = require("./PlayerState");
const LoggerService_1 = require("../services/LoggerService");
const PlayerEventListener_1 = require("./PlayerEventListener");
const ConfigService_1 = require("../services/ConfigService");
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
            const youtubeHome = ConfigService_1.ConfigService.getInstance().getConfig().youtube.home;
            await this.page.goto(`${youtubeHome}/watch?v=${videoId}`, {
                waitUntil: "domcontentloaded"
            });
            // Wait a bit for player to initialize
            await this.page.waitForTimeout(2000);
            await this.dom.waitUntilReady();
            // Reset ended listener to ensure it's attached to the new video
            this.endedListenerInitialized = false;
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
    async openHome() {
        this.navigating = true;
        try {
            this.state = PlayerState_1.PlayerState.LOADING;
            LoggerService_1.LoggerService.info("Opening YouTube home");
            const youtubeHome = ConfigService_1.ConfigService.getInstance().getConfig().youtube.home;
            await this.page.goto(youtubeHome, {
                waitUntil: "domcontentloaded"
            });
            // Wait for page to load
            await this.page.waitForTimeout(2000);
            this.state = PlayerState_1.PlayerState.READY;
            LoggerService_1.LoggerService.info("YouTube home ready.");
        }
        finally {
            this.navigating = false;
        }
    }
    async pause() {
        this.ensureReady();
        await this.dom.pause();
        this.state = PlayerState_1.PlayerState.PAUSED;
    }
    async skipAd() {
        this.ensureReady();
        return await this.dom.skipAd();
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
                videoId: undefined,
                title: undefined,
                channel: undefined,
                thumbnail: undefined
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
                // Get title from YouTube DOM - try multiple selectors
                // Get title and channel from YouTube Player API (works in fullscreen)
                let titleElement = null;
                let channelElement = null;
                let playerApiDuration = 0;
                try {
                    // Try to get data from YouTube Player API
                    const moviePlayer = document.querySelector("#movie_player");
                    if (moviePlayer && typeof moviePlayer.getVideoData === 'function') {
                        const videoData = moviePlayer.getVideoData();
                        if (videoData) {
                            titleElement = videoData.title || null;
                            channelElement = videoData.author || null;
                            playerApiDuration = videoData.length_seconds || 0;
                        }
                    }
                }
                catch (e) {
                    // Fallback to DOM if Player API fails
                }
                // Fallback to DOM if Player API didn't work
                if (!titleElement) {
                    titleElement =
                        document.querySelector("h1.ytd-watch-metadata yt-formatted-string")?.textContent ||
                            document.querySelector(".ytp-title-link")?.textContent ||
                            document.querySelector(".title")?.textContent ||
                            document.querySelector("yt-formatted-string.title")?.textContent ||
                            document.querySelector("h1")?.textContent ||
                            null;
                }
                if (!channelElement) {
                    channelElement =
                        document.querySelector("#channel-name a")?.textContent ||
                            document.querySelector("#owner-name a")?.textContent ||
                            document.querySelector("ytd-channel-name a")?.textContent ||
                            document.querySelector(".ytp-title-channel-name")?.textContent ||
                            document.querySelector("#upload-info #channel-name")?.textContent ||
                            null;
                }
                // Use duration from Player API if available, otherwise from video element
                const finalDuration = playerApiDuration > 0 ? playerApiDuration : duration;
                // Get thumbnail from videoId
                const thumbnail = videoId
                    ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
                    : undefined;
                return {
                    playing,
                    currentTime,
                    duration: finalDuration,
                    volume,
                    muted,
                    fullscreen,
                    videoId,
                    title: titleElement || undefined,
                    channel: channelElement || undefined,
                    thumbnail
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
                videoId: undefined,
                title: undefined,
                channel: undefined,
                thumbnail: undefined
            };
        }
    }
    setOnEnded(callback) {
        this.onEnded =
            callback;
    }
    async setupEndedListener() {
        // Register the exposed function only once
        if (!this.endedFunctionRegistered) {
            await this.page.exposeFunction("youtubeEnded", () => {
                console.log("[YOUTUBE] ended");
                this.onEnded?.();
            });
            this.endedFunctionRegistered = true;
        }
        if (this.endedListenerInitialized) {
            return;
        }
        await this.page.waitForSelector("video");
        await this.page.evaluate(() => {
            const video = document.querySelector("video");
            if (!video) {
                return;
            }
            // Check if listener already attached to this video element
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

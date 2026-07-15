"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.YouTubeController = void 0;
const eventemitter3_1 = __importDefault(require("eventemitter3"));
const PlayerEvents_1 = require("../events/PlayerEvents");
class YouTubeController extends eventemitter3_1.default {
    page;
    constructor(page) {
        super();
        this.page = page;
    }
    async open(videoId) {
        await this.page.goto(`https://www.youtube.com/watch?v=${videoId}`, {
            waitUntil: "networkidle"
        });
        await this.setupEndedListener();
        await this.page.waitForSelector("video");
        this.emit(PlayerEvents_1.PlayerEvent.READY);
    }
    async setupEndedListener() {
        this.page.on("framenavigated", async () => {
            await this.page.evaluate(() => {
                const video = document.querySelector("video");
                if (video) {
                    video.addEventListener("ended", () => {
                        this.emit(PlayerEvents_1.PlayerEvent.ENDED);
                    });
                }
            });
        });
    }
    async play() {
        await this.page.evaluate(() => {
            const video = document.querySelector("video");
            video.play();
        });
        this.emit(PlayerEvents_1.PlayerEvent.PLAY);
    }
    async pause() {
        await this.page.evaluate(() => {
            const video = document.querySelector("video");
            video.pause();
        });
        this.emit(PlayerEvents_1.PlayerEvent.PAUSE);
    }
    async setVolume(volume) {
        const value = Math.min(100, Math.max(0, volume));
        await this.page.evaluate((v) => {
            const video = document.querySelector("video");
            video.volume = v / 100;
        }, value);
    }
    async getStatus() {
        return this.page.evaluate(() => {
            const video = document.querySelector("video");
            const url = new URL(window.location.href);
            return {
                videoId: url.searchParams.get("v"),
                title: document.title,
                playing: !video.paused,
                paused: video.paused,
                ended: video.ended,
                currentTime: video.currentTime,
                duration: video.duration,
                volume: Math.round(video.volume * 100),
                muted: video.muted
            };
        });
    }
}
exports.YouTubeController = YouTubeController;

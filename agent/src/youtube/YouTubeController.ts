import EventEmitter from "eventemitter3";
import { Page } from "playwright";
import type { PlayerStatus } from "../types/PlayerStatus";
import { PlayerEvent } from "../events/PlayerEvents";

export class YouTubeController extends EventEmitter {

    constructor(
        private readonly page: Page
    ) {
        super();
    }

    async open(videoId: string): Promise<void> {

        await this.page.goto(
            `https://www.youtube.com/watch?v=${videoId}`,
            {
                waitUntil: "domcontentloaded"
            }
        );

        await this.page.waitForSelector("video");

        this.emit(PlayerEvent.READY);

    }

    async play(): Promise<void> {

        await this.page.evaluate(() => {

            const video = document.querySelector("video") as HTMLVideoElement;

            video.play();

        });

        this.emit(PlayerEvent.PLAY);

    }

    async pause(): Promise<void> {

        await this.page.evaluate(() => {

            const video = document.querySelector("video") as HTMLVideoElement;

            video.pause();

        });

        this.emit(PlayerEvent.PAUSE);

    }

    async setVolume(volume: number): Promise<void> {

        const value = Math.min(100, Math.max(0, volume));

        await this.page.evaluate((v) => {

            const video = document.querySelector("video") as HTMLVideoElement;

            video.volume = v / 100;

        }, value);

    }

    async getStatus(): Promise<PlayerStatus> {

        return this.page.evaluate(() => {

            const video = document.querySelector("video") as HTMLVideoElement;

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
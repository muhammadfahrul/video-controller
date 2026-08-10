import EventEmitter from "eventemitter3";
import { Page } from "playwright";
import type { PlayerStatus } from "../types/PlayerStatus";
import { PlayerEvent } from "../events/PlayerEvents";
import { ConfigService } from "../services/ConfigService";

export class YouTubeController extends EventEmitter {

    constructor(
        private readonly page: Page
    ) {
        super();
    }

    async open(videoId: string): Promise<void> {

        const youtubeHome = ConfigService.getInstance().getConfig().youtube.home;
        await this.page.goto(
            `${youtubeHome}/watch?v=${videoId}`,
            {
                waitUntil: "networkidle"
            }
        );

        await this.setupEndedListener();

        await this.page.waitForSelector("video");

        this.emit(PlayerEvent.READY);

    }

    private async setupEndedListener(): Promise<void> {

        this.page.on("framenavigated", async () => {

            await this.page.evaluate(() => {

                const video = document.querySelector("video");

                if (video) {

                    video.addEventListener("ended", () => {

                        this.emit(PlayerEvent.ENDED);

                    });

                }

            });

        });

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
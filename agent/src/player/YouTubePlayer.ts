import { Page } from "playwright";

import { YouTubeDOM } from "./YouTubeDOM";
import { PlayerState } from "./PlayerState";
import { PlayerStatus } from "./PlayerStatus";
import { LoggerService } from "../services/LoggerService";
import { PlayerEventPayload } from "./PlayerEventPayload";
import {
    PlayerEventListener
} from "./PlayerEventListener";
import { PlayerSnapshot } from "../types/PlayerSnapshot";
import { ConfigService } from "../services/ConfigService";


export class YouTubePlayer {

    private readonly dom: YouTubeDOM;
    private readonly eventListener: PlayerEventListener;

    private state: PlayerState = PlayerState.IDLE;

    private onEnded?:()=>void;

    private navigating = false;

    private endedFunctionRegistered = false;

    private endedListenerInitialized = false;

    constructor(
        private readonly page: Page
    ){

        this.dom =
            new YouTubeDOM(page);



        this.eventListener =
            new PlayerEventListener();

    }


    public async open(videoId: string): Promise<void> {

        this.navigating = true;

        try {

            this.state = PlayerState.LOADING;

            LoggerService.info(
                `Opening YouTube video ${videoId}`
            );

            // Add stealth script before navigation
            await this.page.addInitScript(() => {
                // Override navigator.webdriver
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => undefined
                });

                // Override permissions
                const originalQuery = window.navigator.permissions.query;
                window.navigator.permissions.query = (parameters: any) => (
                    parameters.name === 'notifications' ?
                        Promise.resolve({ state: Notification.permission } as PermissionStatus) :
                        originalQuery(parameters)
                );

                // Prevent detection
                (window.navigator as any).chrome = true;
            });

            const youtubeHome = ConfigService.getInstance().getConfig().youtube.home;
            await this.page.goto(
                `${youtubeHome}/watch?v=${videoId}`,
                {
                    waitUntil: "domcontentloaded"
                }
            );

            // Wait a bit for player to initialize
            await this.page.waitForTimeout(2000);

            await this.dom.waitUntilReady();

            await this.setupEndedListener();

            await this.attachEvents();

            this.state = PlayerState.READY;

            LoggerService.info(
                "YouTube player ready."
            );

        } finally {

            this.navigating = false;

        }

    }


    public async play(): Promise<void> {

        this.ensureReady();

        console.log(

            "[YouTube] play()"

        );
        
        await this.dom.play();

        this.state = PlayerState.PLAYING;


    }


    public async pause(): Promise<void> {

        this.ensureReady();

        await this.dom.pause();

        this.state = PlayerState.PAUSED;

    }


    public async setVolume(
        volume: number
    ): Promise<void> {

        this.ensureReady();
        
        console.log(
            "YouTubePlayer.setVolume",
            volume
        );

        await this.dom.setVolume(volume);


    }


    public async getStatus(): Promise<PlayerStatus> {

        console.log(
            "Calling page.evaluate"
        );
        const status =
            await this.page.evaluate(() => {

                const video =
                    document.querySelector(
                        "video"
                    ) as HTMLVideoElement | null;


                const title =
                    document.querySelector(
                        "h1"
                    )?.textContent ?? null;


                return {

                    videoId:
                        new URL(location.href)
                            .searchParams
                            .get("v"),


                    title,


                    duration:
                        video?.duration ?? 0,


                    currentTime:
                        video?.currentTime ?? 0,


                    volume:
                        video
                            ? Math.round(video.volume * 100)
                            : 0,


                    muted:
                        video?.muted ?? false,


                    isPlaying:
                        video
                            ? !video.paused
                            : false

                };

            });


        return {

            state:
                status.isPlaying
                    ? PlayerState.PLAYING
                    : PlayerState.PAUSED,


            videoId:
                status.videoId,


            title:
                status.title,


            duration:
                status.duration,


            currentTime:
                status.currentTime,


            volume:
                status.volume,


            muted:
                status.muted

        };

    }


    public getState(): PlayerState {

        return this.state;

    }

    public async seek(
        seconds: number
    ) {

        this.ensureReady();

        await this.dom.seek(
            seconds
        );

    }



    public async mute() {

        this.ensureReady();

        await this.dom.mute();

    }

    public async unmute() {

        this.ensureReady();

        await this.dom.unmute();

    }


    public async stop() {

        this.ensureReady();

        await this.dom.stop();

    }



    public async fullscreen() {

        this.ensureReady();

        console.log(
            "YouTubePlayer.fullscreen"
        );
        
        await this.dom.fullscreen();

    }

    public async exitFullscreen() {

        this.ensureReady();

        await this.dom.exitFullscreen();

    }

    public async toggleFullscreen() {

        this.ensureReady();

        await this.dom.toggleFullscreen();

    }

    public async isFullscreen(): Promise<boolean> {

        this.ensureReady();

        return await this.dom.isFullscreen();

    }


    public async onEvent(
        callback:
        (payload:PlayerEventPayload)=>void
    ):Promise<void>{


        this.eventListener
            .setCallback(callback);



        await this.attachEvents();


    }


    private async attachEvents()
    :Promise<void>{


        await this.dom.listenEvents(

            async(payload)=>{


                await this.eventListener.handle(
                    payload
                );


            }

        );


    }

    public async getSnapshot(): Promise<PlayerSnapshot> {

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

                const player =
                    document.querySelector(
                        ".html5-video-player"
                    ) as any;

                const video =
                    document.querySelector(
                        "video"
                    ) as HTMLVideoElement | null;

                const playing =
                    !!video &&
                    !video.paused &&
                    !video.ended;

                const currentTime =
                    video?.currentTime ?? 0;

                const duration =
                    video?.duration ?? 0;

                const muted =
                    video?.muted ?? false;

                const volume =
                    Math.round(
                        (video?.volume ?? 0) * 100
                    );

                const fullscreen =
                    !!document.fullscreenElement;

                const url =
                    window.location.href;

                const match =
                    url.match(
                        /[?&]v=([^&]+)/i
                    );

                const videoId =
                    match?.[1];

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
        } catch (error) {
            console.warn(

                "[PLAYER] Snapshot skipped",

                error

            );

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

    public setOnEnded(
        callback:()=>void
    ){

        this.onEnded =
            callback;


    }

    private async setupEndedListener() {

        if (this.endedListenerInitialized) {
            return;
        }

        await this.page.exposeFunction(
            "youtubeEnded",
            () => {

                console.log("[YOUTUBE] ended");

                this.onEnded?.();

            }
        );

        await this.page.waitForSelector("video");

        await this.page.evaluate(() => {

            const video =
                document.querySelector("video");

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

    private ensureReady() {

        if (this.navigating) {

            throw new Error(
                "Player is navigating."
            );

        }

    }

    public async getVideoSnapshot() {

        return this.dom.getVideoSnapshot();

    }

    public async waitUntilReady(): Promise<void> {

        await this.dom.waitUntilReady();

    }
}
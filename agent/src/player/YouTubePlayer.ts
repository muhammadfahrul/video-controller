import { Page } from "playwright";

import { YouTubeDOM } from "./YouTubeDOM";
import { PlayerState } from "./PlayerState";
import { PlayerStatus } from "./PlayerStatus";
import { LoggerService } from "../services/LoggerService";
import { PlayerEventPayload } from "./PlayerEventPayload";
import {
    PlayerEventListener
} from "./PlayerEventListener";


export class YouTubePlayer {

    private readonly dom: YouTubeDOM;
    private readonly eventListener: PlayerEventListener;

    private state: PlayerState = PlayerState.IDLE;


    constructor(
        private readonly page: Page
    ){

        this.dom =
            new YouTubeDOM(page);



        this.eventListener =
            new PlayerEventListener();

    }


    public async open(videoId: string): Promise<void> {

        this.state = PlayerState.LOADING;

        LoggerService.info(
            `Opening YouTube video ${videoId}`
        );


        await this.page.goto(
            `https://www.youtube.com/watch?v=${videoId}`,
            {
                waitUntil: "domcontentloaded"
            }
        );


        await this.dom.waitUntilReady();

        await this.attachEvents();


        this.state = PlayerState.READY;


        LoggerService.info(
            "YouTube player ready."
        );

    }


    public async play(): Promise<void> {

        await this.dom.play();

        this.state = PlayerState.PLAYING;


    }


    public async pause(): Promise<void> {

        await this.dom.pause();

        this.state = PlayerState.PAUSED;

    }


    public async setVolume(
        volume: number
    ): Promise<void> {

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
        seconds:number
    ):Promise<void>{

        await this.dom.seek(seconds);

    }



    public async mute():Promise<void>{

        await this.dom.mute();

    }



    public async unmute():Promise<void>{

        await this.dom.unmute();

    }



    public async fullscreen():Promise<void>{

        await this.dom.fullscreen();

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
}
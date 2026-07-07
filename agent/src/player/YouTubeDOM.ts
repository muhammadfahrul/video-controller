declare global {

    interface Window {

        playerEventCallback:
        (payload:any)=>void;

    }

}

import { Page } from "playwright";
import { YouTubeSelectors } from "./YouTubeSelectors";
import { PlayerEvents } from "./PlayerEvents";
import { PlayerEventPayload } from "./PlayerEventPayload";



export class YouTubeDOM {

    private eventsAttached = false;

    constructor(
        private readonly page: Page
    ) {}



    public async waitUntilReady(): Promise<void> {


        await this.page.waitForSelector(
            YouTubeSelectors.video,
            {
                timeout: 30000
            }
        );


    }



    public async play(): Promise<void> {


        await this.page.evaluate(
            (selector) => {


                const video =
                    document.querySelector(
                        selector
                    ) as HTMLVideoElement | null;


                video?.play();


            },
            YouTubeSelectors.video
        );


    }




    public async pause(): Promise<void> {


        await this.page.evaluate(
            (selector) => {


                const video =
                    document.querySelector(
                        selector
                    ) as HTMLVideoElement | null;


                video?.pause();


            },
            YouTubeSelectors.video
        );


    }




    public async seek(
        seconds: number
    ) {

        await this.page.evaluate(

            (time) => {

                const video =
                    document.querySelector("video") as HTMLVideoElement | null;

                if (!video) {
                    throw new Error("Video element not found");
                }

                video.currentTime = time;

            },

            seconds

        );

    }




    public async setVolume(
        volume:number
    ): Promise<void>{


        await this.page.evaluate(

            ({selector, volume})=>{


                const video =
                    document.querySelector(
                        selector
                    ) as HTMLVideoElement | null;


                if(video){

                    video.volume =
                        Math.max(
                            0,
                            Math.min(
                                1,
                                volume / 100
                            )
                        );

                }


            },


            {

                selector:
                    YouTubeSelectors.video,

                volume

            }

        );


    }





    public async mute() {

        await this.page.evaluate(() => {

            const video =
                document.querySelector(
                    "video"
                ) as HTMLVideoElement | null;

            if (!video) {

                throw new Error(
                    "Video not found"
                );

            }

            video.muted = true;

        });

    }

    public async unmute() {

        await this.page.evaluate(() => {

            const video =
                document.querySelector(
                    "video"
                ) as HTMLVideoElement | null;

            if (!video) {

                throw new Error(
                    "Video not found"
                );

            }

            video.muted = false;

        });

    }


    public async stop() {

        await this.page.evaluate(() => {

            const video =
                document.querySelector(
                    "video"
                ) as HTMLVideoElement | null;

            if (!video) {

                throw new Error(
                    "Video not found"
                );

            }

            video.pause();

            video.currentTime = 0;

        });

    }




    public async fullscreen():Promise<void>{


        await this.page.evaluate(

            selector=>{


                const video =
                    document.querySelector(
                        selector
                    ) as HTMLVideoElement | null;



                if(video){

                    video.requestFullscreen();

                }


            },

            YouTubeSelectors.video

        );


    }




    public async isPlaying():Promise<boolean>{


        return await this.page.evaluate(

            selector=>{


                const video =
                    document.querySelector(
                        selector
                    ) as HTMLVideoElement | null;


                return video
                    ? !video.paused
                    : false;


            },

            YouTubeSelectors.video

        );


    }

    public async listenEvents(
        callback: (payload: PlayerEventPayload)=>void
    ): Promise<void> {


        if(this.eventsAttached){

            return;

        }


        await this.page.exposeFunction(
            "playerEventCallback",
            callback
        );


        await this.page.evaluate(
            `
            (selector) => {

                const video =
                    document.querySelector(selector);


                if(!video){
                    return;
                }


                if(video.dataset.agentListener === "true"){
                    return;
                }


                video.dataset.agentListener = "true";


                function sendEvent(eventName){


                    const element = video;


                    window.playerEventCallback({

                        event:eventName,

                        videoId:
                            new URL(window.location.href)
                            .searchParams
                            .get("v"),


                        currentTime:
                            element.currentTime,


                        duration:
                            element.duration,


                        timestamp:
                            Date.now()

                    });


                }



                video.addEventListener(
                    "play",
                    function(){

                        sendEvent("player.play");

                    }
                );



                video.addEventListener(
                    "pause",
                    function(){

                        sendEvent("player.pause");

                    }
                );



                video.addEventListener(
                    "ended",
                    function(){

                        sendEvent("player.end");

                    }
                );



                video.addEventListener(
                    "timeupdate",
                    function(){

                        sendEvent("player.time_update");

                    }
                );


            }
            `,
            YouTubeSelectors.video
        );


        this.eventsAttached = true;

    }

}
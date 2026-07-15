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
import { VideoSnapshot } from "../types/VideoSnapshot";



export class YouTubeDOM {

    private callbackRegistered = false;

    constructor(
        private readonly page: Page
    ) {}



    public async waitUntilReady(): Promise<void> {

        await this.page.waitForSelector(
            YouTubeSelectors.video
        );

        await this.page.waitForFunction(

            (selector) => {

                const video =
                    document.querySelector(
                        selector
                    ) as HTMLVideoElement | null;

                return (

                    video &&

                    video.readyState >= 1 &&

                    video.duration > 0

                );

            },

            YouTubeSelectors.video

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




    public async fullscreen() {

        await this.page.evaluate(async () => {

            if (
                document.fullscreenElement
            ) {

                return;

            }

            await document.documentElement
                .requestFullscreen();

        });

    }


    public async exitFullscreen() {

        await this.page.evaluate(async () => {

            if (
                !document.fullscreenElement
            ) {

                return;

            }

            await document.exitFullscreen();

        });

    }


    public async toggleFullscreen() {

        await this.page.evaluate(async () => {

            if (
                document.fullscreenElement
            ) {

                await document.exitFullscreen();

                return;

            }

            await document.documentElement
                .requestFullscreen();

        });

    }

    public async skipAd(): Promise<boolean> {

        console.log("[YouTubeDOM] Attempting to skip ad...");

        // First, let's check if there's an ad playing
        const isAdPlaying = await this.page.evaluate(() => {

            const video = document.querySelector("video");
            const adContainer = document.querySelector(".ad-showing");
            const player = document.querySelector("#movie_player");

            // Check various ad indicators
            const hasAdOverlay = !!document.querySelector(".ytp-ad-module");
            const hasAdText = !!document.querySelector(".ytp-ad-text");
            const isAd = adContainer !== null || hasAdOverlay || hasAdText;

            console.log("[YouTubeDOM] Ad detection:", {
                hasVideo: !!video,
                hasAdContainer: !!adContainer,
                hasAdOverlay,
                hasAdText,
                isAd
            });

            return isAd;

        });

        console.log("[YouTubeDOM] Is ad playing:", isAdPlaying);

        if (!isAdPlaying) {
            console.log("[YouTubeDOM] No ad detected, skipping skip attempt");
            return false;
        }

        // Try using Playwright's click for more reliable interaction
        const skipButtonSelectors = [
            ".ytp-ad-skip-button",
            ".ytp-ad-skip-button-modern",
            ".videoAdUiSkipButton",
            ".ytp-skip-ad-button",
            ".ytp-ad-skip-button-container button"
        ];

        for (const selector of skipButtonSelectors) {

            try {

                const button = await this.page.$(selector);

                if (button) {

                    const isVisible = await button.isVisible();

                    if (isVisible) {

                        console.log("[YouTubeDOM] Clicking skip button via Playwright:", selector);
                        
                        // Wait for the button to be actionable
                        await button.waitForElementState("visible", { timeout: 2000 });
                        
                        // Click using Playwright for more reliable click
                        await button.click();

                        console.log("[YouTubeDOM] Successfully clicked skip button");
                        return true;

                    }

                }

            } catch (err) {

                console.log("[YouTubeDOM] Error clicking", selector, err);

            }

        }

        // Fallback: try with page.evaluate
        return await this.page.evaluate(async () => {

            console.log("[YouTubeDOM] Trying fallback click method...");

            const skipButtonSelectors = [
                ".ytp-ad-skip-button",
                ".ytp-ad-skip-button-modern", 
                ".videoAdUiSkipButton",
                ".ytp-skip-ad-button"
            ];

            for (const selector of skipButtonSelectors) {

                const skipButton = document.querySelector(selector) as HTMLButtonElement | null;

                if (skipButton) {

                    console.log("[YouTubeDOM] Found and clicking:", selector);
                    
                    // Use both click and programmatic dispatch
                    skipButton.click();

                    // Also try dispatching click event
                    skipButton.dispatchEvent(new MouseEvent("click", {
                        bubbles: true,
                        cancelable: true,
                        view: window
                    }));

                    return true;

                }

            }

            // Try the generic skip button approach
            const allButtons = document.querySelectorAll("button");
            
            for (const btn of allButtons) {

                const text = btn.textContent?.toLowerCase() || "";
                const ariaLabel = btn.getAttribute("aria-label")?.toLowerCase() || "";
                
                if (text.includes("skip") || ariaLabel.includes("skip")) {
                    
                    console.log("[YouTubeDOM] Found button with 'skip' text:", text);
                    (btn as HTMLButtonElement).click();
                    return true;

                }

            }

            console.log("[YouTubeDOM] No skip button found");
            return false;

        });

    }

    public async isFullscreen(): Promise<boolean> {

        return await this.page.evaluate(() => {

            return !!document.fullscreenElement;

        });

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


        if (!this.callbackRegistered) {

            await this.page.exposeFunction(
                "playerEventCallback",
                callback
            );

            this.callbackRegistered = true;
        }


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


            }
            `,
            YouTubeSelectors.video
        );

    }

    public async getVideoSnapshot()
    : Promise<VideoSnapshot> {

        return this.page.evaluate(() => {

            const video =
                document.querySelector(
                    "video"
                ) as HTMLVideoElement | null;

            if (!video) {

                return {

                    exists: false,

                    ready: false,

                    duration: 0,

                    currentTime: 0,

                    ended: false

                };

            }

            return {

                exists: true,

                ready:
                    video.readyState >= 2,

                duration:
                    video.duration,

                currentTime:
                    video.currentTime,

                ended:
                    video.ended

            };

        });

    }

}
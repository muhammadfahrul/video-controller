"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.YouTubeDOM = void 0;
const YouTubeSelectors_1 = require("./YouTubeSelectors");
class YouTubeDOM {
    page;
    callbackRegistered = false;
    constructor(page) {
        this.page = page;
    }
    async waitUntilReady() {
        await this.page.waitForSelector(YouTubeSelectors_1.YouTubeSelectors.video);
        await this.page.waitForFunction((selector) => {
            const video = document.querySelector(selector);
            return (video &&
                video.readyState >= 1 &&
                video.duration > 0);
        }, YouTubeSelectors_1.YouTubeSelectors.video);
    }
    async play() {
        await this.page.evaluate((selector) => {
            const video = document.querySelector(selector);
            video?.play();
        }, YouTubeSelectors_1.YouTubeSelectors.video);
    }
    async pause() {
        await this.page.evaluate((selector) => {
            const video = document.querySelector(selector);
            video?.pause();
        }, YouTubeSelectors_1.YouTubeSelectors.video);
    }
    async seek(seconds) {
        await this.page.evaluate((time) => {
            const video = document.querySelector("video");
            if (!video) {
                throw new Error("Video element not found");
            }
            video.currentTime = time;
        }, seconds);
    }
    async setVolume(volume) {
        await this.page.evaluate(({ selector, volume }) => {
            const video = document.querySelector(selector);
            if (video) {
                video.volume =
                    Math.max(0, Math.min(1, volume / 100));
            }
        }, {
            selector: YouTubeSelectors_1.YouTubeSelectors.video,
            volume
        });
    }
    async mute() {
        await this.page.evaluate(() => {
            const video = document.querySelector("video");
            if (!video) {
                throw new Error("Video not found");
            }
            video.muted = true;
        });
    }
    async unmute() {
        await this.page.evaluate(() => {
            const video = document.querySelector("video");
            if (!video) {
                throw new Error("Video not found");
            }
            video.muted = false;
        });
    }
    async stop() {
        await this.page.evaluate(() => {
            const video = document.querySelector("video");
            if (!video) {
                throw new Error("Video not found");
            }
            video.pause();
            video.currentTime = 0;
        });
    }
    async fullscreen() {
        await this.page.evaluate(async () => {
            if (document.fullscreenElement) {
                return;
            }
            await document.documentElement
                .requestFullscreen();
        });
    }
    async exitFullscreen() {
        await this.page.evaluate(async () => {
            if (!document.fullscreenElement) {
                return;
            }
            await document.exitFullscreen();
        });
    }
    async toggleFullscreen() {
        await this.page.evaluate(async () => {
            if (document.fullscreenElement) {
                await document.exitFullscreen();
                return;
            }
            await document.documentElement
                .requestFullscreen();
        });
    }
    async isFullscreen() {
        return await this.page.evaluate(() => {
            return !!document.fullscreenElement;
        });
    }
    async isPlaying() {
        return await this.page.evaluate(selector => {
            const video = document.querySelector(selector);
            return video
                ? !video.paused
                : false;
        }, YouTubeSelectors_1.YouTubeSelectors.video);
    }
    async listenEvents(callback) {
        if (!this.callbackRegistered) {
            await this.page.exposeFunction("playerEventCallback", callback);
            this.callbackRegistered = true;
        }
        await this.page.evaluate(`
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
            `, YouTubeSelectors_1.YouTubeSelectors.video);
    }
    async getVideoSnapshot() {
        return this.page.evaluate(() => {
            const video = document.querySelector("video");
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
                ready: video.readyState >= 2,
                duration: video.duration,
                currentTime: video.currentTime,
                ended: video.ended
            };
        });
    }
}
exports.YouTubeDOM = YouTubeDOM;

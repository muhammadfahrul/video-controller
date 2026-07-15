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
    async skipAd() {
        // Check for skip button directly - this is the most reliable indicator
        const hasSkipButton = await this.page.evaluate(() => {
            const selectors = [
                ".ytp-ad-skip-button",
                ".ytp-ad-skip-button-modern",
                ".videoAdUiSkipButton",
                ".ytp-skip-ad-button"
            ];
            for (const sel of selectors) {
                const btn = document.querySelector(sel);
                if (btn && btn.offsetParent !== null) { // Check if visible
                    return true;
                }
            }
            return false;
        });
        // If no skip button found, check for ad indicators
        if (!hasSkipButton) {
            const isAdPlaying = await this.page.evaluate(() => {
                const player = document.querySelector("#movie_player");
                // Check various ad indicators
                const hasAdClass = player?.classList.contains("ad-showing");
                const hasAdOverlay = !!document.querySelector(".ytp-ad-overlay-close-button");
                const hasAdText = !!document.querySelector(".ytp-ad-text");
                const hasVideoAdUi = !!document.querySelector(".videoAdUi");
                // Consider as ad if multiple indicators present
                const indicatorCount = (hasAdClass ? 1 : 0) + (hasAdOverlay ? 1 : 0) +
                    (hasAdText ? 1 : 0) + (hasVideoAdUi ? 1 : 0);
                return indicatorCount >= 2;
            });
            if (!isAdPlaying) {
                return false;
            }
        }
        console.log("[YouTubeDOM] Ad detected, attempting to skip...");
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
            }
            catch (err) {
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
                const skipButton = document.querySelector(selector);
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
            // Try the generic skip button approach - but be more specific
            const allButtons = document.querySelectorAll("button, div[role='button']");
            for (const btn of allButtons) {
                const text = btn.textContent?.toLowerCase().trim() || "";
                const ariaLabel = btn.getAttribute("aria-label")?.toLowerCase() || "";
                const ariaLabelOrphan = btn.getAttribute("aria-label-orphan")?.toLowerCase() || "";
                // Only match if it specifically says "skip" (not "skip navigation")
                if ((text === "skip" || text.includes("skip ad") || text.includes("skip advertisement")) ||
                    (ariaLabel.includes("skip") && !ariaLabel.includes("navigation")) ||
                    (ariaLabelOrphan.includes("skip"))) {
                    console.log("[YouTubeDOM] Found button with 'skip' text:", text, "aria:", ariaLabel);
                    btn.click();
                    return true;
                }
            }
            console.log("[YouTubeDOM] No skip button found");
            return false;
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

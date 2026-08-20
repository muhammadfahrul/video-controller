import { Page } from "playwright";
import { YouTubeSelectors } from "./YouTubeSelectors";
import { VideoSnapshot } from "../types/VideoSnapshot";



export class YouTubeDOM {

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

    /**
     * Turns off YouTube's native "Autoplay" toggle (auto-advance to a
     * suggested video), if currently on. Best-effort: the toggle only
     * exists once the player controls have rendered, so a missing element
     * is not an error.
     */
    public async disableAutoplay(): Promise<void> {

        try {

            // The toggle renders shortly after the player controls mount,
            // not immediately with the rest of the DOM - give it a short
            // grace period instead of a single immediate lookup, since a
            // missed attempt here leaves YouTube's autoplay racing our
            // playlist advance for the entire video.
            await this.page.waitForSelector(
                YouTubeSelectors.autoplayToggle,
                { timeout: 5000 }
            );

        } catch (err) {

            console.log("[YouTubeDOM] disableAutoplay: toggle never appeared, skipping:", err);
            return;

        }

        try {

            const clicked = await this.page.evaluate(
                (selector) => {

                    const toggle =
                        document.querySelector(selector) as HTMLElement | null;

                    if (!toggle) {
                        return false;
                    }

                    const isOn =
                        toggle.getAttribute("aria-checked") === "true";

                    if (isOn) {
                        toggle.click();
                    }

                    return isOn;

                },
                YouTubeSelectors.autoplayToggle
            );

            console.log(
                clicked
                    ? "[YouTubeDOM] disableAutoplay: toggle was on, turned off"
                    : "[YouTubeDOM] disableAutoplay: toggle already off"
            );

        } catch (err) {

            console.log("[YouTubeDOM] disableAutoplay skipped:", err);

        }

    }

    public async skipAd(): Promise<boolean> {

        // Check for skip button directly - this is the most reliable indicator
        const hasSkipButton = await this.page.evaluate(() => {

            const selectors = [
                ".ytp-ad-skip-button",
                ".ytp-ad-skip-button-modern",
                ".videoAdUiSkipButton",
                ".ytp-skip-ad-button"
            ];

            for (const sel of selectors) {
                const btn = document.querySelector(sel) as HTMLElement | null;
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
                    (btn as HTMLElement).click();
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
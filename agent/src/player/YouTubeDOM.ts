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

                // YouTube hides ad UI elements with CSS (display: none)
                // once an ad ends rather than removing them from the DOM,
                // so a plain presence check stays true long after the ad
                // is gone. Require the element to actually be visible.
                const isVisible = (el: Element | null): boolean => {
                    if (!el) return false;
                    const rect = (el as HTMLElement).getBoundingClientRect();
                    if (rect.width === 0 && rect.height === 0) return false;
                    const style = window.getComputedStyle(el);
                    return style.display !== "none" && style.visibility !== "hidden";
                };

                // Check various ad indicators
                const hasAdClass = player?.classList.contains("ad-showing");
                const hasAdOverlay = isVisible(document.querySelector(".ytp-ad-overlay-close-button"));
                const hasAdText = isVisible(document.querySelector(".ytp-ad-text"));
                const hasVideoAdUi = isVisible(document.querySelector(".videoAdUi"));

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

            // YouTube can have more than one <video> element in the page at
            // once (e.g. a preloaded/background element for the next
            // suggested video, or miniplayer/PIP support) - a bare
            // querySelector("video") returns document order's FIRST match,
            // which isn't necessarily the one actually playing. That
            // mismatched element can report a stale/never-advancing
            // readyState, making a perfectly healthy, actively-playing
            // video look "unhealthy" and trigger an unwanted
            // RecoveryEngine reload. Scope to #movie_player first, and
            // among any matches there prefer one that's actually made
            // progress (currentTime > 0) over one sitting at 0.
            const candidates = Array.from(
                document.querySelectorAll(
                    "#movie_player video, video"
                )
            ) as HTMLVideoElement[];

            const video =
                candidates.find(v => v.currentTime > 0) ??
                candidates[0] ??
                null;

            if (!video) {

                // YouTube can briefly swap/detach the <video> element during
                // an ad transition (pre/mid-roll) without the page actually
                // being broken. #movie_player is the stable outer player
                // container that survives those swaps - if it's still
                // there, this is a live watch page mid-transition, not a
                // crash, so report healthy instead of tripping
                // VideoHealthCheck/PlayerHealthCheck (which would otherwise
                // have RecoveryEngine reload the page and reopen the
                // current video from scratch after a few seconds of this).
                const stillOnWatchPage =
                    !!document.querySelector("#movie_player");

                return {

                    exists: stillOnWatchPage,

                    ready: stillOnWatchPage,

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
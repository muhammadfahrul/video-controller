import { Page } from "playwright";

import { YouTubeDOM } from "./YouTubeDOM";
import { PlayerState } from "./PlayerState";
import { PlayerStatus } from "./PlayerStatus";
import { LoggerService } from "../services/LoggerService";
import { PlayerSnapshot } from "../types/PlayerSnapshot";
import { ConfigService } from "../services/ConfigService";


export class YouTubePlayer {

    private readonly dom: YouTubeDOM;

    private state: PlayerState = PlayerState.IDLE;

    private onEnded?:()=>void;

    private navigating = false;

    private endedFunctionRegistered = false;

    private endedListenerInitialized = false;

    // Serializes every method below that touches `this.page` (navigation,
    // playback control, fullscreen, ...). Multiple independent call paths
    // (agent startup, server-pushed state restores, incoming commands, the
    // ended-video callback) can all reach this same Page concurrently; without
    // a queue two of them racing - e.g. a background restore's page.goto()
    // overlapping the startup fullscreen() call - throws "Player is
    // navigating." (fatal, crashes the agent) and can corrupt an in-flight
    // YouTube page load (seen as a page-context SyntaxError). Queuing forces
    // them to run one at a time instead of colliding.
    // getSnapshot() is deliberately NOT queued: it's polled every second for
    // state sync and already short-circuits to an empty snapshot while
    // `navigating` is true, so it must stay non-blocking rather than wait in
    // line behind whatever operation is in flight.
    private operationQueue: Promise<unknown> = Promise.resolve();

    constructor(
        private readonly page: Page
    ){

        this.dom =
            new YouTubeDOM(page);

    }

    private enqueue<T>(operation: () => Promise<T>): Promise<T> {

        const run =
            this.operationQueue.then(
                operation,
                operation
            );

        this.operationQueue =
            run.then(
                () => undefined,
                () => undefined
            );

        return run;

    }


    public async open(videoId: string): Promise<void> {

        return this.enqueue(() => this.doOpen(videoId));

    }

    private async doOpen(videoId: string): Promise<void> {

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

            // Prevent YouTube's own "up next" autoplay from racing our
            // playlist advance (see setupEndedListener below) and hijacking
            // playback with a suggested video whenever our navigation to
            // the next playlist item is slower than YouTube's in-page swap.
            await this.dom.disableAutoplay();

            // Reset ended listener to ensure it's attached to the new video
            this.endedListenerInitialized = false;
            await this.setupEndedListener();

            this.state = PlayerState.READY;

            LoggerService.info(
                "YouTube player ready."
            );

        } finally {

            this.navigating = false;

        }

    }


    public async play(): Promise<void> {

        return this.enqueue(() => this.doPlay());

    }

    private async doPlay(): Promise<void> {

        this.ensureReady();

        console.log(

            "[YouTube] play()"

        );

        await this.dom.play();

        this.state = PlayerState.PLAYING;


    }

    public async openHome(): Promise<void> {

        return this.enqueue(() => this.doOpenHome());

    }

    private async doOpenHome(): Promise<void> {

        this.navigating = true;

        try {

            this.state = PlayerState.LOADING;

            LoggerService.info(
                "Opening YouTube home"
            );

            const youtubeHome = ConfigService.getInstance().getConfig().youtube.home;
            await this.page.goto(
                youtubeHome,
                {
                    waitUntil: "domcontentloaded"
                }
            );

            // Wait for page to load
            await this.page.waitForTimeout(2000);

            this.state = PlayerState.READY;

            LoggerService.info(
                "YouTube home ready."
            );

        } finally {

            this.navigating = false;

        }

    }


    public async pause(): Promise<void> {

        return this.enqueue(() => this.doPause());

    }

    private async doPause(): Promise<void> {

        this.ensureReady();

        await this.dom.pause();

    }

    /**
     * Navigate to any URL (used for showing images).
     */
    public async goto(url: string): Promise<void> {

        return this.enqueue(() => this.doGoto(url));

    }

    private async doGoto(url: string): Promise<void> {
        this.ensureReady();

        await this.page.goto(url, { waitUntil: "domcontentloaded" });
        await this.page.waitForTimeout(1000);
    }

    public async skipAd(): Promise<boolean> {

        return this.enqueue(() => this.doSkipAd());

    }

    private async doSkipAd(): Promise<boolean> {

        this.ensureReady();

        return await this.dom.skipAd();

    }


    public async setVolume(
        volume: number
    ): Promise<void> {

        return this.enqueue(() => this.doSetVolume(volume));

    }

    private async doSetVolume(
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

        return this.enqueue(() => this.doSeek(seconds));

    }

    private async doSeek(
        seconds: number
    ) {

        this.ensureReady();

        await this.dom.seek(
            seconds
        );

    }



    public async mute() {

        return this.enqueue(() => this.doMute());

    }

    private async doMute() {

        this.ensureReady();

        await this.dom.mute();

    }

    public async unmute() {

        return this.enqueue(() => this.doUnmute());

    }

    private async doUnmute() {

        this.ensureReady();

        await this.dom.unmute();

    }


    public async stop() {

        return this.enqueue(() => this.doStop());

    }

    private async doStop() {

        this.ensureReady();

        await this.dom.stop();

    }



    public async fullscreen() {

        return this.enqueue(() => this.doFullscreen());

    }

    private async doFullscreen() {

        this.ensureReady();

        console.log(
            "YouTubePlayer.fullscreen"
        );

        await this.dom.fullscreen();

    }

    public async exitFullscreen() {

        return this.enqueue(() => this.doExitFullscreen());

    }

    private async doExitFullscreen() {

        this.ensureReady();

        await this.dom.exitFullscreen();

    }

    public async toggleFullscreen() {

        return this.enqueue(() => this.doToggleFullscreen());

    }

    private async doToggleFullscreen() {

        this.ensureReady();

        await this.dom.toggleFullscreen();

    }

    public async isFullscreen(): Promise<boolean> {

        return this.enqueue(() => this.doIsFullscreen());

    }

    private async doIsFullscreen(): Promise<boolean> {

        this.ensureReady();

        return await this.dom.isFullscreen();

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

                videoId: undefined,

                title: undefined,

                channel: undefined,

                thumbnail: undefined

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

                // Get title from YouTube DOM - try multiple selectors
                // Get title and channel from YouTube Player API (works in fullscreen)
                let titleElement = null;
                let channelElement = null;
                let playerApiDuration = 0;
                
                try {
                    // Try to get data from YouTube Player API
                    const moviePlayer = document.querySelector("#movie_player");
                    if (moviePlayer && typeof (moviePlayer as any).getVideoData === 'function') {
                        const videoData = (moviePlayer as any).getVideoData();
                        if (videoData) {
                            titleElement = videoData.title || null;
                            channelElement = videoData.author || null;
                            playerApiDuration = videoData.length_seconds || 0;
                        }
                    }
                } catch (e) {
                    // Fallback to DOM if Player API fails
                }
                
                // Fallback to DOM if Player API didn't work
                if (!titleElement) {
                    titleElement = 
                        document.querySelector("h1.ytd-watch-metadata yt-formatted-string")?.textContent ||
                        document.querySelector(".ytp-title-link")?.textContent ||
                        document.querySelector(".title")?.textContent ||
                        document.querySelector("yt-formatted-string.title")?.textContent ||
                        document.querySelector("h1")?.textContent ||
                        null;
                }
                
                if (!channelElement) {
                    channelElement = 
                        document.querySelector("#channel-name a")?.textContent ||
                        document.querySelector("#owner-name a")?.textContent ||
                        document.querySelector("ytd-channel-name a")?.textContent ||
                        document.querySelector(".ytp-title-channel-name")?.textContent ||
                        document.querySelector("#upload-info #channel-name")?.textContent ||
                        null;
                }

                // Use duration from Player API if available, otherwise from video element
                const finalDuration = playerApiDuration > 0 ? playerApiDuration : duration;

                // Get thumbnail from videoId
                const thumbnail = videoId 
                    ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
                    : undefined;

                return {

                    playing,

                    currentTime,

                    duration: finalDuration,

                    volume,

                    muted,

                    fullscreen,

                    videoId,

                    title: titleElement || undefined,

                    channel: channelElement || undefined,

                    thumbnail

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

                videoId: undefined,

                title: undefined,

                channel: undefined,

                thumbnail: undefined

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

        // Register the exposed function only once
        if (!this.endedFunctionRegistered) {
            await this.page.exposeFunction(
                "youtubeEnded",
                () => {

                    console.log("[YOUTUBE] ended");

                    this.onEnded?.();

                }
            );
            this.endedFunctionRegistered = true;
        }

        if (this.endedListenerInitialized) {
            return;
        }

        await this.page.waitForSelector("video");

        await this.page.evaluate(() => {

            // YouTube swaps/recreates the <video> element when transitioning
            // through an ad break (e.g. a post-roll ad after the content
            // ends). A listener bound to that specific node is silently lost
            // when it happens, so the app never learns the video ended and
            // YouTube's own autoplay/suggestion takes over uncontested.
            // `ended` doesn't bubble, but capture-phase listeners on
            // `document` still fire for it regardless of which <video> node
            // dispatches it, and `document` survives any in-page element
            // replacement - so attach there instead of on the video element.
            if (document.documentElement.dataset.endedAttached === "true") {
                return;
            }

            document.documentElement.dataset.endedAttached = "true";

            document.addEventListener(
                "ended",
                (event) => {

                    if ((event.target as HTMLElement | null)?.tagName !== "VIDEO") {
                        return;
                    }

                    // A pre/mid-roll ad reaching its own end also fires
                    // "ended" on the <video> element before the real
                    // content plays or resumes. Treating that as "video
                    // finished" would skip to the next playlist item while
                    // the actual content hasn't even played yet. Use the
                    // same ad-indicator heuristic as skipAd() and ignore
                    // the event while an ad is showing - the real content
                    // will fire its own "ended" once it actually finishes.
                    const player = document.querySelector("#movie_player");
                    const hasAdClass = player?.classList.contains("ad-showing") ?? false;
                    const hasAdOverlay = !!document.querySelector(".ytp-ad-overlay-close-button");
                    const hasAdText = !!document.querySelector(".ytp-ad-text");
                    const hasVideoAdUi = !!document.querySelector(".videoAdUi");
                    const adIndicatorCount =
                        (hasAdClass ? 1 : 0) +
                        (hasAdOverlay ? 1 : 0) +
                        (hasAdText ? 1 : 0) +
                        (hasVideoAdUi ? 1 : 0);

                    if (adIndicatorCount >= 2) {
                        return;
                    }

                    // @ts-ignore
                    window.youtubeEnded();

                },
                true
            );

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
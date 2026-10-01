import { Page } from "playwright";

import { YouTubeDOM } from "./YouTubeDOM";
import { PlayerState } from "./PlayerState";
import { PlayerStatus } from "./PlayerStatus";
import { LoggerService } from "../services/LoggerService";
import { PlayerSnapshot } from "../types/PlayerSnapshot";
import { VideoSnapshot } from "../types/VideoSnapshot";
import { ConfigService } from "../services/ConfigService";


export class YouTubePlayer {

    private readonly dom: YouTubeDOM;

    private state: PlayerState = PlayerState.IDLE;

    private onEnded?:()=>void;

    private navigating = false;

    private endedFunctionRegistered = false;

    private endedListenerInitialized = false;

    // videoId that onEnded() has already been fired for. Across many hours
    // of real playback, the native `document.addEventListener("ended", ...,
    // true)` DOM listener (see setupEndedListener below) has NEVER once
    // fired - not "sometimes swallowed by the ad heuristic", but literally
    // zero occurrences of "[YOUTUBE] native 'ended' event received" in logs
    // even across multiple videos playing to a clean, ad-free completion.
    // Something in this Playwright/Chromium/YouTube combination prevents
    // capture-phase document listeners from ever seeing it (YouTube's own
    // code stopping propagation at the document level before ours runs is
    // the leading theory, but not confirmed - not worth chasing further
    // when there's a strictly more reliable signal already at hand).
    // getSnapshot() polls the actual <video>.ended property every ~1s as
    // part of the normal state-sync loop anyway, so it doubles as a fully
    // reliable fallback trigger - see fireEndedOnce() below, which both the
    // (still-kept, in case it ever does fire) DOM listener and the polling
    // fallback funnel through, so whichever notices first wins and the
    // other is a no-op.
    private endedFiredForVideoId?: string;

    // Last non-zero duration observed for the current video. A post-roll
    // ad immediately after content finishes can leave the underlying
    // <video> element in a state where duration reads null/0, paused is
    // true, and - critically - `ended` reads false too (not the ad's own
    // "ad-showing" class either, since the ad has already finished by
    // then), even though the page's own "X:XX / X:XX" progress text
    // confirms the content is fully done. Neither the DOM "ended" event
    // nor the .ended-property poll fallback catches this. A previously-
    // healthy duration disappearing while paused (and no ad currently
    // showing) is treated as an additional "this video is actually done"
    // signal in getSnapshot()'s poll.
    private lastKnownDuration?: number;

    private fireEndedOnce(videoId: string | undefined, source: string) {

        if (!videoId || this.endedFiredForVideoId === videoId) {
            return;
        }

        this.endedFiredForVideoId = videoId;

        LoggerService.info(
            `[YOUTUBE] ended (detected via ${source}) for ${videoId}`
        );

        this.onEnded?.();

    }

    // videoId currently loaded (set once doOpen() successfully navigates to
    // it). Used to skip a redundant re-navigation to the SAME video that's
    // already loaded and playing fine - back-to-back page.goto() calls to
    // the same YouTube watch URL (seen from e.g. two independent startup
    // restore paths, or AddPlaylistHandler reopening a video that happens
    // to already be the one playing) corrupt YouTube's own player.js state
    // enough that the <video> element never starts loading again
    // (permanently stuck at readyState 0, no error anywhere) - not a race
    // to fix at every call site, but a re-navigation that should simply
    // never happen when nothing actually needs to change.
    private currentVideoId?: string;

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


    public async open(videoId: string, force = false): Promise<void> {

        // Captured here (not inside doOpen) so it reflects the real
        // caller - doOpen only runs later, off the operationQueue's
        // .then() chain, by which point the original synchronous call
        // stack is gone.
        const callerStack = new Error().stack;

        return this.enqueue(() => this.doOpen(videoId, force, callerStack));

    }

    private async doOpen(
        videoId: string,
        force = false,
        callerStack?: string
    ): Promise<void> {

        // Trust our own bookkeeping over a fresh DOM read here: a live
        // getVideoSnapshot() check used to decide this (see git history)
        // was itself flaky - a momentary buffering blip could make an
        // otherwise-fine video read as "not ready" for a fraction of a
        // second, causing the redundant reopen we're trying to prevent in
        // the first place. If we already believe this exact video is
        // loaded, that's good enough; only RecoveryEngine (which is
        // explicitly trying to fix a video it already knows is broken)
        // should ever pass force:true to bypass this.
        //
        // Must cover READY, PLAYING, and PAUSED - not just READY. `state`
        // moves to PLAYING within moments of doOpen() finishing (play() is
        // called right after open() by openVideo()), so a guard scoped to
        // READY only protects the first second or so of a video's life.
        // Any later request for the same videoId - e.g. a user re-clicking
        // the currently-playing item in the playlist panel, which sends
        // PLAY_PLAYLIST_ITEM for a video that's already playing - would
        // fall straight through this guard and hit the exact corrupting
        // reopen this exists to prevent. LOADING/IDLE/ERROR are correctly
        // excluded: those mean nothing is safely loaded yet, so a real
        // open() must proceed.
        if (
            !force &&
            this.currentVideoId === videoId &&
            (
                this.state === PlayerState.READY ||
                this.state === PlayerState.PLAYING ||
                this.state === PlayerState.PAUSED
            )
        ) {

            LoggerService.info(
                `Video ${videoId} is already loaded - skipping redundant reopen`
            );

            return;

        }

        if (videoId === this.currentVideoId) {

            // We're about to actually re-navigate to the SAME video that's
            // supposedly already loaded (either force:true, or the guard
            // above didn't apply because `state` wasn't READY at this
            // point) - this is exactly the situation that corrupts
            // playback, so capture who asked for it and what state we
            // thought we were in.
            LoggerService.warn(
                `Reopening ${videoId} which is already currentVideoId (force=${force}, state=${this.state}). Caller:\n${callerStack}`
            );

        }

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

            // Reset ended listener to ensure it's attached to the new video.
            // Not wrapping this in try/catch used to mean a single hiccup
            // here (e.g. waitForSelector("video") timing out on a slow-
            // loading page) silently left THIS video with no "ended"
            // listener at all - it would play to completion, YouTube would
            // sit on its own end screen, and nothing would ever tell
            // PlaylistService to advance, looking exactly like "playlist
            // won't move to the next item" with zero error in the logs.
            // Retry once, and log loudly if it still fails, instead of
            // letting the video open "successfully" with no way to ever
            // detect its end.
            this.endedListenerInitialized = false;
            try {
                await this.setupEndedListener();
            } catch (error) {
                LoggerService.warn(
                    `Failed to attach ended-listener, retrying once: ${error}`
                );
                try {
                    this.endedListenerInitialized = false;
                    await this.setupEndedListener();
                } catch (retryError) {
                    LoggerService.error(
                        `Failed to attach ended-listener after retry - this video's end will NOT be auto-detected: ${retryError}`
                    );
                }
            }

            this.state = PlayerState.READY;

            this.currentVideoId = videoId;

            // A fresh video (even a repeat of the same id via `force`)
            // hasn't ended yet - clear so fireEndedOnce() will fire again
            // for it rather than treating it as already-handled from a
            // previous play-through.
            this.endedFiredForVideoId = undefined;

            this.lastKnownDuration = undefined;

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

                const hasAdShowingClass =
                    document.querySelector("#movie_player")
                        ?.classList.contains("ad-showing") ?? false;

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

                    thumbnail,

                    ended: video?.ended ?? false,

                    hasAdShowingClass

                };

            }).then(snapshot => {

                // Fallback for the native "ended" DOM event never firing
                // (see endedFiredForVideoId's declaration) - this 1s-cycle
                // poll of the real <video>.ended property is what actually
                // drives playlist advancement in practice.
                if (snapshot.ended) {
                    this.fireEndedOnce(snapshot.videoId, "poll-fallback");
                }

                // Second fallback: a post-roll ad right after content
                // finishes can leave <video> with duration null/0, paused,
                // and `ended` still false (see lastKnownDuration's
                // declaration) - a previously-healthy duration vanishing
                // while paused and no ad currently showing means the
                // content is actually done, just not reporting it normally.
                else if (
                    !snapshot.duration &&
                    !snapshot.playing &&
                    !snapshot.hasAdShowingClass &&
                    this.lastKnownDuration &&
                    this.currentVideoId === snapshot.videoId
                ) {
                    this.fireEndedOnce(snapshot.videoId, "duration-lost-fallback");
                }

                if (snapshot.duration > 0) {
                    this.lastKnownDuration = snapshot.duration;
                }

                return snapshot;

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

                    this.fireEndedOnce(this.currentVideoId, "dom-event");

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

                    console.log(
                        "[YOUTUBE] native 'ended' event received, target tag:",
                        (event.target as HTMLElement | null)?.tagName
                    );

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
                    //
                    // YouTube hides these ad UI elements with CSS (display:
                    // none) once an ad ends rather than removing them from
                    // the DOM, so a plain querySelector() presence check
                    // stays true for the rest of the video - if THIS video
                    // itself had a pre/mid-roll ad earlier, its leftover
                    // (hidden) markup would make the real end-of-video
                    // "ended" event look like an ad ending too, silently
                    // swallowing it and leaving playback stuck paused with
                    // no advance to the next playlist item. Require the
                    // element to actually be visible, not just present.
                    const isVisible = (el: Element | null): boolean => {
                        if (!el) return false;
                        const rect = (el as HTMLElement).getBoundingClientRect();
                        if (rect.width === 0 && rect.height === 0) return false;
                        const style = window.getComputedStyle(el);
                        return style.display !== "none" && style.visibility !== "hidden";
                    };

                    const player = document.querySelector("#movie_player");
                    const hasAdClass = player?.classList.contains("ad-showing") ?? false;
                    const hasAdOverlay = isVisible(document.querySelector(".ytp-ad-overlay-close-button"));
                    const hasAdText = isVisible(document.querySelector(".ytp-ad-text"));
                    const hasVideoAdUi = isVisible(document.querySelector(".videoAdUi"));
                    const adIndicatorCount =
                        (hasAdClass ? 1 : 0) +
                        (hasAdOverlay ? 1 : 0) +
                        (hasAdText ? 1 : 0) +
                        (hasVideoAdUi ? 1 : 0);

                    console.log(
                        "[YOUTUBE] ended - ad indicators:",
                        { hasAdClass, hasAdOverlay, hasAdText, hasVideoAdUi, adIndicatorCount }
                    );

                    if (adIndicatorCount >= 2) {
                        console.log(
                            "[YOUTUBE] ended event swallowed - looked like an ad ending"
                        );
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

    public async getVideoSnapshot(): Promise<VideoSnapshot> {

        // Opening a video (doOpen: navigate, wait, waitUntilReady,
        // disableAutoplay, ...) legitimately takes several seconds, during
        // which no <video> element exists yet. HealthService polls this
        // every HEALTH_INTERVAL (default 5s) with no awareness of that -
        // if an open happens to run long (slow network, an ad, autoplay
        // toggle taking its 5s timeout), 3 consecutive polls can land
        // entirely inside that window, VideoHealthCheck/PlayerHealthCheck
        // see "exists: false" each time, and RecoveryEngine.recover
        // (RELOAD_PAGE) fires mid-navigation - reloading the page and
        // reopening the same video from scratch, then pausing it (the
        // captured snapshot's `playing` was still false since playback
        // hadn't started yet), leaving it stuck. Report healthy instead of
        // touching the page while a navigation we already know about is in
        // flight.
        if (this.navigating) {

            return {
                exists: true,
                ready: true,
                duration: 0,
                currentTime: 0,
                ended: false
            };

        }

        return this.dom.getVideoSnapshot();

    }

    public async waitUntilReady(): Promise<void> {

        await this.dom.waitUntilReady();

    }
}
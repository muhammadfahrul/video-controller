import {
 BrowserService
} from "../services/BrowserService";


import {
 PlayerService
} from "../services/PlayerService";


import {
 PlaylistService
} from "../services/PlaylistService";

import {
    SocketClient,
    AgentIdentityProvider,
    AgentIdentity,
    HeartbeatService,
    CommandRouter
} from "../network";

import {
    CommandService
} from "../services";

import {
    CommandDispatcher,
    CommandType,
    PlayHandler,
    PauseHandler,
    VolumeHandler,
    SeekHandler,
    MuteHandler,
    UnmuteHandler,
    StopHandler,
    OpenVideoHandler,
    NextHandler,
    PreviousHandler,
    AddPlaylistHandler,
    RemovePlaylistHandler,
    ClearPlaylistHandler,
    PlayPlaylistItemHandler,
    ShufflePlaylistHandler,
    MovePlaylistItemHandler
} from "../commands";
import { FullscreenHandler } from "../commands/handlers/FullscreenHandler";
import { ExitFullscreenHandler } from "../commands/handlers/ExitFullscreenHandler";
import { ToggleFullscreenHandler } from "../commands/handlers/ToggleFullscreenHandler";
import { RepeatModeHandler } from "../commands/handlers/RepeatModeHandler";
import { SkipAdHandler } from "../commands/handlers/SkipAdHandler";
import { SetAutoSkipAdsHandler } from "../commands/handlers/SetAutoSkipAdsHandler";
import { RepeatMode } from "../playlist/RepeatMode";
import { PlaylistRepository } from "../repositories/PlaylistRepository";
import { PlayerRepository } from "../repositories/PlayerRepository";
import { HealthService } from "../health/HealthService";
import { ConfigService } from "../services/ConfigService";


export class Agent {


    private browser:
        BrowserService;

    private health?: HealthService;


    private player?:
        PlayerService;

    private playerRepository =
        new PlayerRepository();


    private playlist:
        PlaylistService;

    private socketClient?:
        SocketClient;


    private heartbeat?:
        HeartbeatService;

    private commandRouter?:
        CommandRouter;

    private commandDispatcher:
        CommandDispatcher;

    private playerStateTimer?: NodeJS.Timeout;

    private playlistStateTimer?: NodeJS.Timeout;

    private adSkipTimer?: NodeJS.Timeout;

    private autoSkipEnabled = true;

    // Flag to pause state sync during data clearing
    private isSyncingPaused = false;

    // Timestamp when sync was paused - used by the safety-timeout watchdog in
    // startPlayerStateSync() to auto-resume if the expected reactivation
    // event (which normally calls resumeStateSync()) is ever missed.
    private syncPausedAt?: number;

    // Safety margin for the pause watchdog. The real clear-data sequence only
    // needs ~100-500ms; this is a generous bound so a missed reactivation
    // event can't wedge sync off forever.
    private static readonly SYNC_PAUSE_SAFETY_TIMEOUT_MS = 15000;

    private identity:
        AgentIdentity;


    constructor() {

        this.browser =
            new BrowserService();

        const playlistRepository =
            new PlaylistRepository();

        this.playlist =
            new PlaylistService(
                playlistRepository
            );

        this.commandDispatcher =
            new CommandDispatcher();

        const commandService =
            new CommandService(
                this.commandDispatcher
            );

        this.commandRouter =
            new CommandRouter(
                commandService
            );

        const config =
            ConfigService
                .getInstance()
                .getConfig();

        this.identity =
            new AgentIdentityProvider()
                .get();

        const serverUrl =
            ConfigService
                .getInstance()
                .getServerUrl();

        this.socketClient =
            new SocketClient(
                serverUrl,
                this.identity,
                this.commandRouter,
                this.playerRepository,
                this.playlist.getRepository()
            );

        // Set agent reference in socket client for sync control
        this.socketClient?.setAgent(this);

    }




    async start() {

        // Set up global error handlers to catch unhandled errors
        this.setupGlobalErrorHandlers();

        const config =
            ConfigService
                .getInstance()
                .getConfig();

        try {
            // Connect socket FIRST so agent can register
            // Use waitForConnection to ensure socket is connected before proceeding
            console.log("[AGENT] Connecting to server...");
            this.socketClient?.connect();
        
        // Wait for socket to be connected first
        await this.socketClient?.waitForConnection();
        
        // Check if billing is enabled
        const billingEnabled = config.billing?.enabled ?? true;
        
        if (billingEnabled) {
            // Billing enabled - wait for activation from cashier
            console.log("[AGENT] Billing enabled - waiting for activation from cashier...");
            
            // Send periodic heartbeats while waiting so server doesn't mark as OFFLINE
            const heartbeatInterval = setInterval(() => {
                this.socketClient?.sendHeartbeat();
            }, 5000);
            
            // Wait for activation from cashier
            await this.socketClient?.waitForActivation();
            
            // Stop the heartbeat interval since we're activating
            clearInterval(heartbeatInterval);
            
            console.log("[AGENT] Room activated! Starting services...");
        } else {
            // Billing disabled - start normally without waiting
            console.log("[AGENT] Billing disabled - starting services directly...");
            
            // Register as already active
            this.socketClient?.setActive(true);
        }


        await this.browser.start();

        this.player =
            new PlayerService(
                this.browser.getPage(),
                this.playerRepository
            );

        // Show start image when room is activated
        await this.player.showStartImage();

        // Set player service in socket client for clear data functionality
        this.socketClient?.setPlayerService(this.player);
        
        // Set playlist service in socket client for clear data functionality
        this.socketClient?.setPlaylistService(this.playlist);

        this.health = new HealthService(

            this.browser.getBrowserManager(),

            this.player,

            (event) => this.socketClient?.sendError(event)

        );

        this.health.start(
            config.health.interval
        );

        const saved =

            await this.player.loadSnapshot();

        console.log(

            "[PLAYER RESTORE]",

            saved

        );

        await this.player.restore()

        // If no saved video, show start image (stay on start screen until user plays something)
        const snapshot = await this.player.getSnapshot();
        if (!snapshot || !snapshot.videoId) {
            console.log("[AGENT] No saved video, showing start image");
            // Keep showing start image - don't navigate to YouTube
        } else {
            // Restore video playback if there was a saved video
            console.log("[AGENT] Restored video, playing:", snapshot.videoId);
        }

        // Load playlist state BEFORE setting up ended callback
        // This ensures repeatMode is restored before playlist.next() is called
        await this.playlist.load();

        console.log(
            "[PLAYLIST] Restored",
            this.playlist.size(),
            "items"
        );

        // Enter fullscreen on startup
        await this.player.fullscreen();

        // Set up ended callback AFTER playlist.load() to ensure repeatMode is restored
        this.player.setOnEnded(async () => {

            console.log(
                "[AGENT] Video ended, repeatMode:",
                this.playlist.getRepeatMode()
            );

            const next =
                await this.playlist.next();

            if (!next) {

                console.log(
                    "[PLAYLIST] No next item"
                );

                return;

            }

            console.log(

                "[PLAYLIST] Playing next",

                next.title

            );

            await this.player!
                .openVideo(
                    next.videoId
                );

        });

        this.registerCommands();

        // NOTE: socketClient.connect() was previously called again here, but the
        // socket + all its listeners (agent:activation, command, database-restore,
        // deactivation) are already fully set up by the connect() call above
        // (line ~176). playerService/playlistService are read dynamically by those
        // listeners at event-fire time, so no reconnect is needed once they're set
        // via setPlayerService/setPlaylistService. Calling connect() twice created
        // a second io() instance and abandoned the first without disconnecting it.

        this.heartbeat =
            new HeartbeatService(
                this.socketClient!
            );

        this.heartbeat.start();

        this.startPlayerStateSync();

        this.sendCurrentPlaylist();

        this.startPlaylistSync();

        this.startAutoSkipAds();

        } catch (err) {
            // Catch any startup errors and report to server
            console.error("[AGENT] Startup error:", err);
            this.socketClient?.sendError({
                type: "STARTUP_ERROR",
                message: err instanceof Error ? err.message : String(err),
                stack: err instanceof Error ? err.stack : undefined
            });
            throw err;
        }
    }

    // A fatal error may have run while the process was in the middle of
    // anything - the process is in an undefined state afterwards, so we
    // exit rather than limp on. The process manager (PM2/NSSM/etc.) is
    // responsible for relaunching. The short delay just gives the error
    // report a chance to actually reach the socket before the process dies.
    private static readonly FATAL_ERROR_EXIT_DELAY_MS = 500;

    // Set up global error handlers to catch unhandled errors
    private setupGlobalErrorHandlers() {
        // Handle uncaught exceptions
        process.on("uncaughtException", (err) => {
            console.error("[AGENT] Uncaught exception:", err);
            this.socketClient?.sendError({
                type: "UNCAUGHT_EXCEPTION",
                message: err.message,
                stack: err.stack
            });
            setTimeout(() => process.exit(1), Agent.FATAL_ERROR_EXIT_DELAY_MS);
        });

        // Handle unhandled promise rejections
        process.on("unhandledRejection", (reason, promise) => {
            console.error("[AGENT] Unhandled rejection:", reason);
            this.socketClient?.sendError({
                type: "UNHANDLED_REJECTION",
                message: reason instanceof Error ? reason.message : String(reason),
                stack: reason instanceof Error ? reason.stack : undefined,
                context: { promise: String(promise) }
            });
            setTimeout(() => process.exit(1), Agent.FATAL_ERROR_EXIT_DELAY_MS);
        });
    }

    getPlayer(){

        if(!this.player){

            throw new Error(
                "Player not ready"
            );

        }


        return this.player;

    }




    getPlaylist(){

        return this.playlist;

    }


    private registerCommands() {

        if (!this.player) {

            throw new Error(
                "Player not initialized."
            );

        }

        this.commandDispatcher.register(
            CommandType.PLAY,
            new PlayHandler(this.player)
        );

        this.commandDispatcher.register(
            CommandType.PAUSE,
            new PauseHandler(this.player)
        );

        this.commandDispatcher.register(
            CommandType.VOLUME,
            new VolumeHandler(this.player)
        );

        this.commandDispatcher.register(
            CommandType.SEEK,
            new SeekHandler(
                this.player
            )
        );

        this.commandDispatcher.register(
            CommandType.MUTE,
            new MuteHandler(
                this.player!
            )
        );

        this.commandDispatcher.register(
            CommandType.UNMUTE,
            new UnmuteHandler(
                this.player!
            )
        );

        this.commandDispatcher.register(
            CommandType.STOP,
            new StopHandler(
                this.player!
            )
        );

        this.commandDispatcher.register(
            CommandType.OPEN_VIDEO,
            new OpenVideoHandler(
                this.player!
            )
        );

        this.commandDispatcher.register(
            CommandType.NEXT,
            new NextHandler(
                this.player!,
                this.playlist
            )
        );

        this.commandDispatcher.register(
            CommandType.PREVIOUS,
            new PreviousHandler(
                this.player!,
                this.playlist
            )
        );

        this.commandDispatcher.register(
            CommandType.FULLSCREEN,
            new FullscreenHandler(
                this.player!
            )
        );

        this.commandDispatcher.register(
            CommandType.EXIT_FULLSCREEN,
            new ExitFullscreenHandler(
                this.player!
            )
        );

        this.commandDispatcher.register(
            CommandType.TOGGLE_FULLSCREEN,
            new ToggleFullscreenHandler(
                this.player!
            )
        );

        this.commandDispatcher.register(
            CommandType.ADD_PLAYLIST,
            new AddPlaylistHandler(
                this.playlist
            )
        );

        this.commandDispatcher.register(
            CommandType.REMOVE_PLAYLIST,
            new RemovePlaylistHandler(
                this.playlist
            )
        );

        this.commandDispatcher.register(
            CommandType.CLEAR_PLAYLIST,
            new ClearPlaylistHandler(
                this.playlist
            )
        );

        this.commandDispatcher.register(
            CommandType.PLAY_PLAYLIST_ITEM,
            new PlayPlaylistItemHandler(
                this.player!,
                this.playlist
            )
        );

        this.commandDispatcher.register(
            CommandType.SHUFFLE_PLAYLIST,
            new ShufflePlaylistHandler(
                this.playlist
            )
        );

        this.commandDispatcher.register(
            CommandType.MOVE_PLAYLIST_ITEM,
            new MovePlaylistItemHandler(
                this.playlist
            )
        );

        this.commandDispatcher.register(
            CommandType.REPEAT_OFF,
            new RepeatModeHandler(
                this.playlist,
                RepeatMode.OFF
            )
        );

        this.commandDispatcher.register(
            CommandType.REPEAT_ONE,
            new RepeatModeHandler(
                this.playlist,
                RepeatMode.ONE
            )
        );

        this.commandDispatcher.register(
            CommandType.REPEAT_ALL,
            new RepeatModeHandler(
                this.playlist,
                RepeatMode.ALL
            )
        );

        this.commandDispatcher.register(
            CommandType.SKIP_AD,
            new SkipAdHandler(
                this.player!
            )
        );

        this.commandDispatcher.register(
            CommandType.SET_AUTO_SKIP_ADS,
            new SetAutoSkipAdsHandler(
                (enabled) => this.setAutoSkipEnabled(enabled)
            )
        );
    }

    public setAutoSkipEnabled(enabled: boolean): void {
        this.autoSkipEnabled = enabled;
        console.log("[AGENT] autoSkipEnabled set to", enabled);
    }

    public getSocketClient() {

        return this.socketClient;

    }

    public getDispatcher() {

        return this.commandDispatcher;

    }

    // Pause state sync during data clearing
    public pauseStateSync(): void {
        this.isSyncingPaused = true;
        this.syncPausedAt = Date.now();
        console.log("[AGENT] State sync paused, isSyncingPaused:", this.isSyncingPaused);
    }

    // Resume state sync when data is cleared or room is reactivated
    public resumeStateSync(): void {
        this.isSyncingPaused = false;
        this.syncPausedAt = undefined;
        console.log("[AGENT] State sync resumed, isSyncingPaused:", this.isSyncingPaused);
    }

    // Check if sync is paused
    public isSyncPaused(): boolean {
        console.log("[AGENT] Checking isSyncPaused:", this.isSyncingPaused);
        return this.isSyncingPaused;
    }

    public async stop() {

        this.heartbeat?.stop();

        await this.browser.stop();

        if (

            this.playerStateTimer

        ) {

            clearInterval(

                this.playerStateTimer

            );

        }

        if(
            this.playlistStateTimer
        ){

            clearInterval(
                this.playlistStateTimer
            );

        }

        this.stopAutoSkipAds();

        this.health?.stop();
    }


    // Local safety net: if expiresAt has passed but the room is still marked
    // active locally, self-deactivate instead of relying solely on an
    // explicit deactivation push (agent:activation / cashier:deactivate-room)
    // arriving. Mirrors the stop+expired-image sequence SocketClient already
    // runs for those two events.
    private async checkExpiryWatchdog(): Promise<void> {
        if (!this.identity.isActive || !this.identity.expiresAt) {
            return;
        }

        // Compare against server time (local clock + last known offset from
        // the server) instead of raw Date.now(), so a drifted local clock on
        // the room PC can't cut a session short or let it run past its paid
        // time.
        const serverAdjustedNow = Date.now() + (this.identity.serverTimeOffsetMs ?? 0);

        if (serverAdjustedNow < this.identity.expiresAt) {
            return;
        }

        console.warn(
            "[AGENT] Expiry watchdog: expiresAt has passed but room still marked active locally - self-deactivating"
        );

        this.socketClient?.sendError({
            type: "WATCHDOG_EXPIRY_FIRED",
            message: "Local expiry watchdog self-deactivated the room; explicit deactivation push was not received in time",
            context: {
                expiresAt: this.identity.expiresAt,
                serverAdjustedNow,
                serverTimeOffsetMs: this.identity.serverTimeOffsetMs ?? 0
            }
        });

        this.identity.isActive = false;

        try {
            await this.player?.stop();
        } catch (err) {
            console.error("[AGENT] Error stopping playback (expiry watchdog):", err);
        }

        try {
            await this.player?.showExpiredImage();
        } catch (err) {
            console.error("[AGENT] Error showing expired image (expiry watchdog):", err);
        }
    }

    // Safety net for pauseStateSync(): if sync has been paused for longer
    // than SYNC_PAUSE_SAFETY_TIMEOUT_MS with no reactivation event arriving
    // to resume it, auto-resume so a single missed event can't permanently
    // stop the agent from ever reporting state again.
    private checkPauseWatchdog(): void {
        if (
            !this.isSyncingPaused ||
            !this.syncPausedAt ||
            Date.now() - this.syncPausedAt <= Agent.SYNC_PAUSE_SAFETY_TIMEOUT_MS
        ) {
            return;
        }

        console.warn(
            "[AGENT] State sync watchdog: paused for over",
            Agent.SYNC_PAUSE_SAFETY_TIMEOUT_MS,
            "ms with no reactivation event - auto-resuming"
        );

        this.socketClient?.sendError({
            type: "WATCHDOG_PAUSE_AUTO_RESUME",
            message: "Local pause watchdog auto-resumed state sync; expected reactivation event was not received in time",
            context: {
                pausedForMs: this.syncPausedAt ? Date.now() - this.syncPausedAt : undefined,
                safetyTimeoutMs: Agent.SYNC_PAUSE_SAFETY_TIMEOUT_MS
            }
        });

        this.resumeStateSync();
    }

    private startPlayerStateSync() {

        this.playerStateTimer = setInterval(

            async () => {

                try {

                    await this.checkExpiryWatchdog();

                    this.checkPauseWatchdog();

                    // Skip sending state if sync is paused (during data clearing)
                    if (this.isSyncingPaused) {
                        console.log("[AGENT] Skipping state sync - isSyncingPaused is true");
                        return;
                    }

                    if (
                        !this.player ||
                        !this.socketClient
                    ) {

                        return;

                    }

                    const playerSnapshot =

                        await this.player
                            .getSnapshot();

                    const playlistSnapshot =

                        this.playlist
                            .getSnapshot();

                    this.socketClient
                        .sendPlayerState({

                            agentId:
                                this.identity.id,


                            player:
                                playerSnapshot,


                            playlist:
                                playlistSnapshot

                        });

                }

                catch (err) {

                    if (
                        err instanceof Error &&
                        err.message.includes("Execution context was destroyed")
                    ) {

                        // Page is transitioning, skip this cycle.
                        return;
                    }

                    console.error(err);

                }

            },

            1000

        );

    }


    private startAutoSkipAds() {

        this.adSkipTimer = setInterval(

            async () => {

                try {

                    if (
                        !this.autoSkipEnabled ||
                        !this.player
                    ) {

                        return;

                    }

                    // Skip ad if possible
                    const skipped = await this.player.skipAd();

                    if (skipped) {

                        console.log(
                            "[Agent] Auto-skipped ad"
                        );

                    }

                }

                catch (err) {

                    // Ignore errors in auto-skip
                    console.log(
                        "[Agent] Auto-skip error (ignored):",
                        err
                    );

                }

            },

            // Check every 500ms for ads
            500

        );

    }


    private stopAutoSkipAds() {

        if (this.adSkipTimer) {

            clearInterval(
                this.adSkipTimer
            );

            this.adSkipTimer = undefined;

        }

    }


    private startPlaylistSync() {

        this.playlistStateTimer =

            setInterval(

                () => {

                    const snapshot =

                        this.playlist.getSnapshot();

                    this.socketClient

                        ?.sendPlaylistState(

                            snapshot

                        );

                },

                1000

            );

    }

    private sendCurrentPlaylist() {

        if (!this.socketClient) {

            return;

        }

        this.socketClient.sendPlaylistState(

            this.playlist.getSnapshot()

        );

    }
}
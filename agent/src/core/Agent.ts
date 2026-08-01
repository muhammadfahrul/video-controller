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
    ShufflePlaylistHandler
} from "../commands";
import { FullscreenHandler } from "../commands/handlers/FullscreenHandler";
import { ExitFullscreenHandler } from "../commands/handlers/ExitFullscreenHandler";
import { ToggleFullscreenHandler } from "../commands/handlers/ToggleFullscreenHandler";
import { RepeatModeHandler } from "../commands/handlers/RepeatModeHandler";
import { SkipAdHandler } from "../commands/handlers/SkipAdHandler";
import { AtmosphereHandler } from "../commands/handlers/AtmosphereHandler";
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

    }




    async start() {

        const config =
            ConfigService
                .getInstance()
                .getConfig();

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

        // Set player service in socket client for clear data functionality
        this.socketClient?.setPlayerService(this.player);

        this.health = new HealthService(

            this.browser.getBrowserManager(),

            this.player

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

        // If no saved video, open YouTube home
        const snapshot = await this.player.getSnapshot();
        if (!snapshot || !snapshot.videoId) {
            console.log("[AGENT] No saved video, opening YouTube home");
            await this.player.openVideo("");
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

        // NOTE: connect() already called at the top of start() — do NOT call again
        this.heartbeat =
            new HeartbeatService(
                this.socketClient!
            );

        this.heartbeat.start();

        this.startPlayerStateSync();

        this.startAutoSkipAds();

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
            throw new Error("Player not initialized.");
        }

        // Use local variable after null-check to avoid repeated non-null assertions
        const player = this.player;

        this.commandDispatcher.register(CommandType.PLAY, new PlayHandler(player));
        this.commandDispatcher.register(CommandType.PAUSE, new PauseHandler(player));
        this.commandDispatcher.register(CommandType.VOLUME, new VolumeHandler(player));
        this.commandDispatcher.register(CommandType.SEEK, new SeekHandler(player));
        this.commandDispatcher.register(CommandType.MUTE, new MuteHandler(player));
        this.commandDispatcher.register(CommandType.UNMUTE, new UnmuteHandler(player));
        this.commandDispatcher.register(CommandType.STOP, new StopHandler(player));
        this.commandDispatcher.register(CommandType.OPEN_VIDEO, new OpenVideoHandler(player));
        this.commandDispatcher.register(CommandType.NEXT, new NextHandler(player, this.playlist));
        this.commandDispatcher.register(CommandType.PREVIOUS, new PreviousHandler(player, this.playlist));
        this.commandDispatcher.register(CommandType.FULLSCREEN, new FullscreenHandler(player));
        this.commandDispatcher.register(CommandType.EXIT_FULLSCREEN, new ExitFullscreenHandler(player));
        this.commandDispatcher.register(CommandType.TOGGLE_FULLSCREEN, new ToggleFullscreenHandler(player));
        this.commandDispatcher.register(CommandType.ADD_PLAYLIST, new AddPlaylistHandler(this.playlist));
        this.commandDispatcher.register(CommandType.REMOVE_PLAYLIST, new RemovePlaylistHandler(this.playlist));
        this.commandDispatcher.register(CommandType.CLEAR_PLAYLIST, new ClearPlaylistHandler(this.playlist));
        this.commandDispatcher.register(CommandType.PLAY_PLAYLIST_ITEM, new PlayPlaylistItemHandler(player, this.playlist));
        this.commandDispatcher.register(CommandType.SHUFFLE_PLAYLIST, new ShufflePlaylistHandler(this.playlist));
        this.commandDispatcher.register(CommandType.REPEAT_OFF, new RepeatModeHandler(this.playlist, RepeatMode.OFF));
        this.commandDispatcher.register(CommandType.REPEAT_ONE, new RepeatModeHandler(this.playlist, RepeatMode.ONE));
        this.commandDispatcher.register(CommandType.REPEAT_ALL, new RepeatModeHandler(this.playlist, RepeatMode.ALL));
        this.commandDispatcher.register(CommandType.SKIP_AD, new SkipAdHandler(player));
        this.commandDispatcher.register(CommandType.ATMOSPHERE, new AtmosphereHandler(player));
    }

    public getSocketClient() {

        return this.socketClient;

    }

    public getDispatcher() {

        return this.commandDispatcher;

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


    private startPlayerStateSync() {

        this.playerStateTimer = setInterval(

            async () => {

                try {

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


    // startPlaylistSync() and sendCurrentPlaylist() removed:
    // Playlist snapshot is already sent every second inside startPlayerStateSync()
    // via sendPlayerState({ player, playlist }). Sending it again here is redundant.
}
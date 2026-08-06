import { io, Socket } from "socket.io-client";

import {
    AgentIdentity
} from "./AgentIdentity";


import {
    CommandPayload
} from "../commands";

import {
    CommandRouter
} from "./CommandRouter";
import { PlayerSnapshot } from "../types/PlayerSnapshot";
import { SocketEvents } from "../socket/SocketEvents";
import { PlaylistSnapshot } from "../types/PlaylistSnapshot";

import {

    AgentSnapshot

} from "../types/AgentSnapshot";
import { PlayerRepository } from "../repositories/PlayerRepository";
import { PlaylistRepository } from "../repositories/PlaylistRepository";
import { PlayerService } from "../services/PlayerService";
import { PlaylistService } from "../services/PlaylistService";
import { Agent } from "../core/Agent";

export class SocketClient {


    private socket?:
        Socket;

    private commandRouter?:
        CommandRouter;

    private playerRepository?: PlayerRepository;
    private playlistRepository?: PlaylistRepository;
    private playerService?: PlayerService;
    private playlistService?: PlaylistService;
    private agent?: Agent;


    constructor(
        private readonly serverUrl: string,
        private readonly identity: AgentIdentity,
        commandRouter: CommandRouter,
        playerRepository?: PlayerRepository,
        playlistRepository?: PlaylistRepository
    ) {

        this.commandRouter = commandRouter;
        this.playerRepository = playerRepository;
        this.playlistRepository = playlistRepository;
        // Note: setupActivationListener is called in connect() after socket is created

    }




    connect() {

        this.socket =
            io(
                this.serverUrl,
                {
                    transports: ["websocket", "polling"],
                    reconnection: true,
                    reconnectionAttempts: 10,
                    reconnectionDelay: 1000,
                    timeout: 10000
                }
            );

        // Set up activation & clear-data listeners AFTER socket is created
        this.setupActivationListener();

        this.socket.on(
            "connect",
            () => {
                console.log("[SOCKET] Connected to server");
                // Register immediately after connection
                this.register();

                // Set up listener for receiving player state from server (for database restore)
                this.setupDatabaseRestoreListener();

                // Wait for activation after registering
                this.waitForActivation().then(isActive => {
                    if (isActive) {
                        console.log("[SOCKET] Room activated!");
                    } else {
                        console.log("[SOCKET] Waiting for cashier activation...");
                    }
                });

            }
        );

        // Fix #15: Re-register agent automatically on reconnect
        this.socket.on(
            "reconnect",
            () => {
                console.log("[SOCKET] Reconnected, re-registering agent...");
                this.register();
            }
        );

        this.socket.on(
            "command",
            async (command) => {

                // Check if room is activated before processing any command
                if (!this.identity.isActive) {
                    console.log("[SOCKET] Room not active yet, ignoring command.");
                    return;
                }

                try {
                    await this.commandRouter?.handle(command);
                } catch (err) {
                    console.error("[SOCKET] Command error", err);
                }

            }
        );

    }




    private register(){


        this.socket?.emit(
            "agent:register",
            this.identity
        );


    }


    private activationResolve?: (isActive: boolean) => void;
    // Track if activation was already handled by setupActivationListener
    private activationHandled = false;

    // Promise that resolves when room is activated
    public waitForActivation(): Promise<boolean> {
        return new Promise((resolve) => {
            if (this.identity.isActive) {
                resolve(true);
                return;
            }

            // Check if setupActivationListener already handled activation
            // (handles race between register() and activation event)
            if (this.identity.isActive) {
                console.log("[SOCKET] Activation already handled, resolving immediately");
                resolve(true);
                return;
            }

            // Store the resolve function
            this.activationResolve = resolve;

            console.log("[SOCKET] Waiting for activation event...");

            // Set up a one-time listener for the activation event
            const onActivation = (data: { isActive: boolean }) => {
                console.log("[SOCKET] Received activation event:", data);
                this.identity.isActive = data.isActive;

                // Clean up this listener
                this.socket?.off("agent:activation", onActivation);

                resolve(data.isActive);
            };

            this.socket?.on("agent:activation", onActivation);

            // Double-check after a small delay in case event arrived while setting up
            setTimeout(() => {
                if (this.identity.isActive && !this.activationHandled) {
                    this.activationHandled = true;
                    resolve(true);
                    this.socket?.off("agent:activation", onActivation);
                }
            }, 100);
        });
    }

    private setupActivationListener() {

        // Remove existing listener first to avoid duplicates
        this.socket?.off("agent:activation");
        
        this.socket?.on(
            "agent:activation",
            async (data: { 
                isActive: boolean; 
                expiresAt?: number; 
                customerName?: string;
                customerPhone?: string;
                customerEmail?: string;
                customerNote?: string;
            }) => {
                console.log("Room activation updated:", data);
                this.identity.isActive = data.isActive;
                
                // Set expiresAt if provided
                if (data.expiresAt) {
                    this.identity.expiresAt = data.expiresAt;
                    console.log("[SOCKET] Expiry time set:", new Date(data.expiresAt).toISOString());
                }
                
                // Set customer info if provided
                if (data.customerName) {
                    this.identity.customerName = data.customerName;
                    console.log("[SOCKET] Customer name set:", data.customerName);
                }
                if (data.customerPhone) {
                    this.identity.customerPhone = data.customerPhone;
                    console.log("[SOCKET] Customer phone set:", data.customerPhone);
                }
                if (data.customerEmail) {
                    this.identity.customerEmail = data.customerEmail;
                    console.log("[SOCKET] Customer email set:", data.customerEmail);
                }
                if (data.customerNote) {
                    this.identity.customerNote = data.customerNote;
                    console.log("[SOCKET] Customer note set:", data.customerNote);
                }
                
                // Resolve the activation promise (for waiting agent)
                if (this.activationResolve) {
                    this.activationResolve(data.isActive);
                    this.activationResolve = undefined;
                }
                
                if (!data.isActive) {
                    // Stop playback when deactivated
                    console.log("Room deactivated, stopping playback");
                    // Send STOP command to player
                    try {
                        await this.commandRouter?.handle({ type: "STOP" } as any);
                        console.log("Playback stopped due to deactivation");
                    } catch (err) {
                        console.error("Error stopping playback:", err);
                    }
                    
                    // Show expired image when room is deactivated
                    try {
                        await this.playerService?.showExpiredImage();
                        console.log("Displayed expired image");
                    } catch (err) {
                        console.error("Error showing expired image:", err);
                    }
                } else if (data.isActive) {
                    // Room was reactivated - resume state sync
                    console.log("Room reactivated, resuming state sync");
                    this.resumeStateSync();
                    
                    // Show start image when room is reactivated
                    try {
                        await this.playerService?.showStartImage();
                        console.log("Displayed start image on reactivation");
                    } catch (err) {
                        console.error("Error showing start image:", err);
                    }
                }
            }
        );

        // Set up clear data listener
        this.setupClearDataListener();
        
        // Set up deactivation listener (for cashier:deactivate-room event)
        this.setupDeactivationListener();
    }

    // Listen for explicit deactivation from cashier
    private setupDeactivationListener() {
        this.socket?.off(SocketEvents.CASHIER_DEACTIVATE_ROOM);
        
        this.socket?.on(
            SocketEvents.CASHIER_DEACTIVATE_ROOM,
            async () => {
                console.log("[SOCKET] Received deactivate room event from cashier");
                
                // Stop playback
                try {
                    await this.commandRouter?.handle({ type: "STOP" } as any);
                    console.log("Playback stopped due to deactivation");
                } catch (err) {
                    console.error("Error stopping playback:", err);
                }
                
                // Show expired image
                try {
                    await this.playerService?.showExpiredImage();
                    console.log("Displayed expired image");
                } catch (err) {
                    console.error("Error showing expired image:", err);
                }
            }
        );
    }

    // Listen for player/playlist data restored from server database
    private setupDatabaseRestoreListener() {
        this.socket?.off(SocketEvents.PLAYER_STATE);
        
        this.socket?.on(
            SocketEvents.PLAYER_STATE,
            async (payload: { agentId?: string; player?: any }) => {
                // Only handle if we receive player data (not when we send)
                // Check if this is a restore response (no video playing)
                if (payload.player && payload.player.videoId && payload.player.videoId !== "") {
                    console.log("[SOCKET] Received player state from server (restore):", payload.player);
                    
                    // Restore player state using PlayerService
                    if (this.playerService) {
                        await this.playerService.restoreState(payload.player);
                        console.log("[SOCKET] Player state restored from server");
                    }
                }
            }
        );

        this.socket?.off(SocketEvents.PLAYLIST_STATE);
        
        this.socket?.on(
            SocketEvents.PLAYLIST_STATE,
            async (payload: any) => {
                // Only handle if we receive playlist data (not when we send)
                if (payload && payload.items && payload.items.length > 0) {
                    console.log("[SOCKET] Received playlist state from server (restore):", payload);
                    
                    // Restore playlist state using PlaylistService
                    if (this.playlistService) {
                        await this.playlistService.restoreState(payload);
                        console.log("[SOCKET] Playlist state restored from server");
                    }
                }
            }
        );
    }

    private setupClearDataListener() {
        this.socket?.off(SocketEvents.AGENT_CLEAR_DATA);
        
        this.socket?.on(
            SocketEvents.AGENT_CLEAR_DATA,
            async () => {
                console.log("Received clear-data event, clearing player and playlist data");
                
                try {
                    // Pause state sync to prevent overwriting with old data during clearing
                    this.pauseStateSync();
                    
                    // Clear player data using PlayerService (sets clearing flag to prevent overwriting)
                    if (this.playerService) {
                        await this.playerService.clearData();
                        console.log("Player data cleared");
                    }
                    
                    // Clear playlist data
                    if (this.playlistRepository) {
                        await this.playlistRepository.clear();
                    }
                    // Also clear in-memory playlist state
                    if (this.playlistService) {
                        await this.playlistService.clear();
                        console.log("Playlist in-memory state cleared");
                    }
                    
                    console.log("All data cleared successfully");
                    
                    // Show expired image after clearing (not YouTube home)
                    if (this.playerService) {
                        await this.playerService.showExpiredImage();
                        console.log("Displayed expired image after clear-data");
                    }
                    
                    // Send empty state to update UI on cashier and web PWA
                    // Use setTimeout to ensure data is fully cleared first
                    setTimeout(() => {
                        this.sendPlayerState({
                            player: {
                                playing: false,
                                currentTime: 0,
                                duration: 0,
                                volume: 100,
                                muted: false,
                                fullscreen: false,
                                videoId: undefined,
                                title: undefined
                            },
                            playlist: {
                                items: [],
                                currentIndex: -1,
                                repeat: "off",
                                shuffle: false
                            }
                        });
                        
                        this.sendPlaylistState({
                            items: [],
                            currentIndex: -1,
                            repeat: "off",
                            shuffle: false
                        });
                        
                        console.log("[SocketClient] Empty state sent to cashier and PWA");
                        
                        // NOTE: Do NOT resume sync here!
                        // Sync will be resumed when the room is reactivated (agent:activation with isActive: true)
                    }, 100);
                } catch (err) {
                    console.error("Error clearing data:", err);
                }
            }
        );
    }





    sendHeartbeat(){


        this.socket?.emit(
            "agent:heartbeat",
            {

                id:
                this.identity.id

            }
        );


    }

    public sendPlayerState(
        state: AgentSnapshot
    ): void {
        // Fix #10: removed console.log here — this is called every 1 second
        // and flooding the console with snapshot data severely hurts performance.
        this.socket?.emit(
            SocketEvents.PLAYER_STATE,
            state
        );
    }


    public sendPlaylistState(

        snapshot: PlaylistSnapshot

    ) {

        this.socket?.emit(

            SocketEvents.PLAYLIST_STATE,

            snapshot

        );

    }

    // Send error report to server
    public sendError(error: {
        type: string;
        message: string;
        stack?: string;
        context?: Record<string, unknown>;
    }): void {
        this.socket?.emit(
            SocketEvents.AGENT_ERROR,
            {
                agentId: this.identity.id,
                roomId: this.identity.roomId,
                timestamp: Date.now(),
                ...error
            }
        );
    }


    // Check if room is activated
    public isActive(): boolean {
        return this.identity.isActive;
    }

    // Set active status directly (for when billing is disabled)
    public setActive(active: boolean): void {
        this.identity.isActive = active;
    }

    // Wait for socket to be connected
    public waitForConnection(): Promise<void> {
        return new Promise((resolve) => {
            if (this.socket?.connected) {
                resolve();
            } else {
                this.socket?.once('connect', () => {
                    resolve();
                });
            }
        });
    }

    // Set player service for clear data functionality
    public setPlayerService(playerService: PlayerService): void {
        this.playerService = playerService;
    }

    // Set playlist service for clear data functionality
    public setPlaylistService(playlistService: PlaylistService): void {
        this.playlistService = playlistService;
    }

    // Set agent reference for sync control
    public setAgent(agent: Agent): void {
        this.agent = agent;
    }

    // Pause state sync during data clearing
    private pauseStateSync(): void {
        this.agent?.pauseStateSync();
    }

    // Resume state sync after data is cleared
    private resumeStateSync(): void {
        this.agent?.resumeStateSync();
    }


}
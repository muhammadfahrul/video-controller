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

export class SocketClient {


    private socket?:
        Socket;

    private commandRouter?:
        CommandRouter;

    private playerRepository?: PlayerRepository;
    private playlistRepository?: PlaylistRepository;
    private playerService?: PlayerService;

    /** Resolve function for waitForActivation() — called by setupActivationListener() */
    private activationResolve?: (isActive: boolean) => void;


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
                this.serverUrl
            );

        // Set up activation & clear-data listeners AFTER socket is created
        this.setupActivationListener();

        this.socket.on(
            "connect",
            () => {
                console.log("[SOCKET] Connected to server");
                // Register immediately after connection
                this.register();
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

        const handleCommand = async (command: any) => {

            console.log("[SOCKET] Received command", command);

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

        };

        this.socket.on(
            SocketEvents.COMMAND,
            handleCommand
        );

        // Fallback for any literal event name mismatch
        this.socket.on(
            "command",
            handleCommand
        );

        // Additional fallback if server ever forwards the player command event directly
        this.socket.on(
            SocketEvents.PLAYER_COMMAND,
            handleCommand
        );

    }




    private register(){


        this.socket?.emit(
            "agent:register",
            this.identity
        );


    }


    // Fix #5: Removed standalone waitForActivation() that created a duplicate listener.
    // Activation is now handled solely by setupActivationListener().
    // Agent.start() calls socketClient.setActive(true) directly when billing is disabled.
    public waitForActivation(): Promise<boolean> {
        return new Promise((resolve) => {
            if (this.identity.isActive) {
                resolve(true);
                return;
            }
            // Store resolve so setupActivationListener can call it
            this.activationResolve = resolve;
        });
    }

    private setupActivationListener() {

        // Remove existing listener first to avoid duplicates
        this.socket?.off("agent:activation");
        
        this.socket?.on(
            "agent:activation",
            async (data: { isActive: boolean }) => {
                console.log("Room activation updated:", data);
                this.identity.isActive = data.isActive;
                
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
                }
            }
        );

        // Set up clear data listener
        this.setupClearDataListener();
    }

    private setupClearDataListener() {
        this.socket?.off(SocketEvents.AGENT_CLEAR_DATA);
        
        this.socket?.on(
            SocketEvents.AGENT_CLEAR_DATA,
            async () => {
                console.log("Received clear-data event, clearing player and playlist data");
                
                try {
                    // Clear player data using PlayerService (sets clearing flag to prevent overwriting)
                    if (this.playerService) {
                        await this.playerService.clearData();
                        console.log("Player data cleared");
                    }
                    
                    // Clear playlist data
                    if (this.playlistRepository) {
                        await this.playlistRepository.clear();
                        console.log("Playlist data cleared");
                    }
                    
                    console.log("All data cleared successfully");
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


}
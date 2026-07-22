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

export class SocketClient {


    private socket?:
        Socket;

    private commandRouter?:
        CommandRouter;


    constructor(
        private readonly serverUrl: string,
        private readonly identity: AgentIdentity,
        commandRouter: CommandRouter
    ) {

        this.commandRouter = commandRouter;
        // Note: setupActivationListener is called in connect() after socket is created

    }




    connect(){

        this.socket =
            io(
                this.serverUrl
            );

        // Set up activation listener AFTER socket is created
        this.setupActivationListener();



        this.socket.on(
            "connect",
            ()=>{


                console.log(
                    "Connected to server"
                );


                // Register immediately after connection
                this.register();

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



        this.socket.on(
            "command",
            async (command) => {

                console.log("Received command", command);

                // Check if room is activated before processing any command
                if (!this.identity.isActive) {
                    console.log("Room is not active yet. Waiting for cashier activation.");
                    return;
                }

                console.log("Router:", this.commandRouter);

                try {

                    await this.commandRouter?.handle(command);

                    console.log("Command finished");

                } catch (err) {

                    console.error("Command error", err);

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
    
    // Promise that resolves when room is activated
    public waitForActivation(): Promise<boolean> {
        return new Promise((resolve) => {
            // If already active, resolve immediately
            if (this.identity.isActive) {
                console.log("[SOCKET] Already active, resolving immediately");
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

        console.log(

            "[Agent Snapshot]",

            state

        );

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


}
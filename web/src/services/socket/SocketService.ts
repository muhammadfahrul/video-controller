import { io, Socket } from "socket.io-client";

import { env } from "../../config/env";

import { useAppStore } from "../../store/appStore";

type EventCallback = (payload: unknown) => void;

interface PendingHandler {
    event: string;
    callback: EventCallback;
}

export class SocketService {

    private socket?: Socket;
    private pendingHandlers: PendingHandler[] = [];
    private stateReceived = false;

    connect() {

        if (this.socket) {

            console.log(
                "[Socket] Already initialized"
            );

            return;

        }

        console.log(
            "[Socket] Creating socket"
        );

        this.socket = io(env.apiUrl, {

            transports: ["websocket"],

            auth: {
                token: env.sharedSecret
            }

        });

        this.socket.on("connect_error", (err) => {
            console.error("[Socket] Connection rejected by server:", err.message);
        });

        this.socket.on("connect", () => {

            console.log(
                "[Socket] Connected",
            );

            console.log(
                this.socket?.id
            );

            // Reset state received flag on reconnect
            this.stateReceived = false;

            // Register pending handlers after connection
            this.registerPendingHandlers();

            // Request current state from server to ensure we have latest data
            this.socket?.emit("client:request-state");

            // Set a timeout to disable loading if state isn't received
            // This prevents indefinite loading if server doesn't respond
            const loadingTimeout = setTimeout(() => {
                if (!this.stateReceived) {
                    console.warn("[Socket] State not received after 5s, disabling loading anyway");
                    useAppStore.getState().setInitialLoading(false);
                }
            }, 5000);

            // Store timeout ID for cleanup if state arrives before timeout
            (this.socket as any)._loadingTimeout = loadingTimeout;

        });

        // Global listener for ALL events to debug what's coming through
        this.socket?.onAny((event, ...args) => {
            console.log("[Socket] ANY event received:", event, args);
        });

        this.socket.on("disconnect", (reason) => {

            console.log(

                "[Socket] Disconnected",

                reason

            );

            // Reset state received flag
            this.stateReceived = false;

        });

    }

    private registerPendingHandlers() {

        for (const handler of this.pendingHandlers) {
            
            console.log(
                "[Socket] Register pending handler:",
                handler.event
            );

            const originalCallback = handler.callback;
            
            this.socket?.on(
                handler.event,
                (payload: unknown) => {

                    console.log(
                        "[Socket] Receive",
                        handler.event,
                        payload
                    );

                    // Mark state as received when agent or playlist state arrives
                    if (handler.event === "agent:state" || handler.event === "playlist:state" || handler.event === "agent" || handler.event === "playlist") {
                        if (!this.stateReceived) {
                            this.stateReceived = true;
                            // Clear loading timeout since state arrived
                            const timeout = (this.socket as any)._loadingTimeout;
                            if (timeout) {
                                clearTimeout(timeout);
                            }
                            // Disable loading immediately when state is received
                            useAppStore.getState().setInitialLoading(false);
                            console.log("[Socket] Initial state received, loading disabled");
                        }
                    }

                    originalCallback(payload);

                }
            );

        }

        this.pendingHandlers = [];

    }

    disconnect() {

        this.socket?.disconnect();

        this.socket = undefined;
    }

    on<T>(
        event: string,
        callback: (payload: T) => void
    ) {

        console.log(
            "[Socket] Register",
            event
        );

        // If socket is already connected, register immediately
        if (this.socket?.connected) {
            
            this.socket.on(
                event,
                (payload: T) => {

                    console.log(
                        "[Socket] Receive",
                        event,
                        payload
                    );

                    // Mark state as received for state-related events
                    if ((event === "agent:state" || event === "playlist:state" || event === "agent" || event === "playlist") && !this.stateReceived) {
                        this.stateReceived = true;
                        const timeout = (this.socket as any)._loadingTimeout;
                        if (timeout) {
                            clearTimeout(timeout);
                        }
                        useAppStore.getState().setInitialLoading(false);
                        console.log("[Socket] Initial state received via on(), loading disabled");
                    }

                    // Debug: Log ALL events
                    console.log("[Socket] All events - event:", event, "payload:", payload);
                    callback(payload);

                }
            );

        } else {
            
            // Store handler to register after connection
            this.pendingHandlers.push({
                event,
                callback: callback as EventCallback
            });

        }

    }

    off(

        event: string

    ) {

        this.socket?.off(event);

    }

    emit(

        event: string,

        payload?: unknown

    ) {

        this.socket?.emit(

            event,

            payload

        );

    }

    isConnected() {

        return this.socket?.connected ?? false;

    }

}

export const socketService =
    new SocketService();
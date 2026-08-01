import { io, Socket } from "socket.io-client";
import { env } from "../../config/env";
import { useAppStore } from "../../store/appStore";

type EventCallback = (payload: unknown) => void;

export class SocketService {
    private socket?: Socket;
    private handlers: Map<string, Set<EventCallback>> = new Map();

    connect() {
        if (this.socket) {
            if (!this.socket.connected) {
                this.socket.connect();
            }
            return;
        }

        this.socket = io(env.apiUrl, {
            transports: ["websocket"]
        });

        // Register all tracked handlers onto the newly created socket instance
        for (const [event, callbacks] of this.handlers.entries()) {
            for (const callback of callbacks) {
                this.socket.on(event, callback);
            }
        }

        this.socket.on("connect", () => {
            // Disable initial loading after data is received
            setTimeout(() => {
                useAppStore.getState().setInitialLoading(false);
            }, 1000);
        });

        this.socket.on("connect_error", () => {
            // Disable initial loading on connection error so UI doesn't hang indefinitely
            useAppStore.getState().setInitialLoading(false);
        });

        this.socket.on("disconnect", () => undefined);
    }

    disconnect() {
        this.socket?.disconnect();
        this.socket = undefined;
    }

    on<T>(event: string, callback: (payload: T) => void) {
        let eventCallbacks = this.handlers.get(event);
        if (!eventCallbacks) {
            eventCallbacks = new Set();
            this.handlers.set(event, eventCallbacks);
        }
        
        const cb = callback as EventCallback;
        if (eventCallbacks.has(cb)) {
            return;
        }
        eventCallbacks.add(cb);

        // If socket instance already exists, register handler directly on it
        if (this.socket) {
            this.socket.on(event, cb);
        }
    }

    off<T>(event: string, callback?: (payload: T) => void) {
        if (callback) {
            const eventCallbacks = this.handlers.get(event);
            if (eventCallbacks) {
                eventCallbacks.delete(callback as EventCallback);
                if (eventCallbacks.size === 0) {
                    this.handlers.delete(event);
                }
            }
            this.socket?.off(event, callback as EventCallback);
        } else {
            this.handlers.delete(event);
            this.socket?.off(event);
        }
    }

    emit(event: string, payload?: unknown) {
        this.socket?.emit(event, payload);
    }

    isConnected() {
        return this.socket?.connected ?? false;
    }
}

export const socketService = new SocketService();


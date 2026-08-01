import { io, Socket } from "socket.io-client";
import { env } from "../../config/env";
import { useAppStore } from "../../store/appStore";

type EventCallback = (payload: unknown) => void;

type QueuedEmit = {
    event: string;
    payload?: unknown;
};

export class SocketService {
    private socket?: Socket;
    private handlers: Map<string, Map<EventCallback, EventCallback>> = new Map();
    private emitQueue: QueuedEmit[] = [];

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
            for (const callback of callbacks.values()) {
                this.socket.on(event, callback);
            }
        }

        this.socket.on("connect", () => {
            console.log("[SOCKET] Connected to server");
            // Flush queued emits once socket is connected
            while (this.emitQueue.length > 0) {
                const queued = this.emitQueue.shift();
                if (queued) {
                    console.log("[SOCKET] Flushing queued emit", queued.event, queued.payload);
                    this.socket?.emit(queued.event, queued.payload);
                }
            }

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
            eventCallbacks = new Map();
            this.handlers.set(event, eventCallbacks);
        }

        const cb = callback as EventCallback;
        if (eventCallbacks.has(cb)) {
            return;
        }

        const listener: EventCallback = (payload) => {
            console.log("[SOCKET] Incoming event", event, payload);
            cb(payload);
        };

        eventCallbacks.set(cb, listener);

        // If socket instance already exists, register handler directly on it
        if (this.socket) {
            this.socket.on(event, listener);
        }
    }

    off<T>(event: string, callback?: (payload: T) => void) {
        if (callback) {
            const eventCallbacks = this.handlers.get(event);
            if (eventCallbacks) {
                const mapped = eventCallbacks.get(callback as EventCallback);
                if (mapped) {
                    this.socket?.off(event, mapped);
                    eventCallbacks.delete(callback as EventCallback);
                }
                if (eventCallbacks.size === 0) {
                    this.handlers.delete(event);
                }
            }
        } else {
            const eventCallbacks = this.handlers.get(event);
            if (eventCallbacks) {
                for (const listener of eventCallbacks.values()) {
                    this.socket?.off(event, listener);
                }
            }
            this.handlers.delete(event);
        }
    }

    emit(event: string, payload?: unknown) {
        if (!this.socket) {
            console.warn("[SOCKET] Socket not initialized, queueing emit", event, payload);
            this.emitQueue.push({ event, payload });
            return;
        }

        if (!this.socket.connected) {
            console.warn("[SOCKET] Socket not connected, queueing emit", event, payload);
            this.emitQueue.push({ event, payload });
            return;
        }

        this.socket.emit(event, payload);
    }

    isConnected() {
        return this.socket?.connected ?? false;
    }
}

export const socketService = new SocketService();


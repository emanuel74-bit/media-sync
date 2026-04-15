import { Alert, Stream, StreamInspection } from "@/types";

type SocketLike = {
    connected: boolean;
    connect: () => void;
    disconnect: () => void;
    on: (event: string, listener: (...args: any[]) => void) => void;
};

type EventMap = {
    connection: boolean;
    "stream.synced": Stream;
    "stream.removed": string;
    "alert.created": Alert;
    "stream.inspected": StreamInspection;
};

type Listener<K extends keyof EventMap> = (payload: EventMap[K]) => void;

class WebSocketManager {
    private socket: SocketLike | null = null;
    private listeners = new Map<string, Set<Function>>();
    private _connected = false;
    private scriptPromise: Promise<void> | null = null;

    get connected() {
        return this._connected;
    }

    connect() {
        void this.ensureConnected();
    }

    private async ensureConnected() {
        if (this.socket) {
            if (!this.socket.connected) {
                this.socket.connect();
            }
            return;
        }

        const baseUrl =
            (import.meta.env.VITE_API_URL || "").replace(/\/$/, "") ||
            window.location.origin;
        await this.ensureSocketClientLoaded(baseUrl);

        if (typeof window.io !== "function") {
            return;
        }

        this.socket = window.io(baseUrl, {
            path: "/socket.io",
            transports: ["websocket", "polling"],
            autoConnect: true,
        });

        this.socket.on("connect", () => {
            this._connected = true;
            this.emit("connection", true);
        });

        this.socket.on("disconnect", () => {
            this._connected = false;
            this.emit("connection", false);
        });

        this.socket.on("stream.synced", (payload: Stream) =>
            this.emit("stream.synced", payload),
        );
        this.socket.on("stream.removed", (payload: string) =>
            this.emit("stream.removed", payload),
        );
        this.socket.on("alert.created", (payload: Alert) =>
            this.emit("alert.created", payload),
        );
        this.socket.on("stream.inspected", (payload: StreamInspection) =>
            this.emit("stream.inspected", payload),
        );
    }

    private ensureSocketClientLoaded(baseUrl: string) {
        if (typeof window === "undefined") {
            return Promise.resolve();
        }

        if (typeof window.io === "function") {
            return Promise.resolve();
        }

        if (this.scriptPromise) {
            return this.scriptPromise;
        }

        this.scriptPromise = new Promise<void>((resolve, reject) => {
            const existing = document.querySelector<HTMLScriptElement>(
                'script[data-socket-io-client="true"]',
            );

            if (existing) {
                existing.addEventListener("load", () => resolve(), {
                    once: true,
                });
                existing.addEventListener(
                    "error",
                    () => reject(new Error("Failed to load Socket.IO client")),
                    { once: true },
                );
                return;
            }

            const script = document.createElement("script");
            script.src = `${baseUrl}/socket.io/socket.io.min.js`;
            script.async = true;
            script.dataset.socketIoClient = "true";
            script.onload = () => resolve();
            script.onerror = () =>
                reject(new Error("Failed to load Socket.IO client"));
            document.head.appendChild(script);
        }).catch(() => {
            this.scriptPromise = null;
        });

        return this.scriptPromise;
    }

    on<K extends keyof EventMap>(event: K, listener: Listener<K>) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }

        this.listeners.get(event)!.add(listener);

        return () => {
            this.listeners.get(event)?.delete(listener);
        };
    }

    private emit(event: keyof EventMap, data: EventMap[keyof EventMap]) {
        this.listeners.get(event)?.forEach((listener) => {
            listener(data);
        });
    }

    disconnect() {
        this.socket?.disconnect();
        this.socket = null;
        this._connected = false;
    }
}

export const wsManager = new WebSocketManager();

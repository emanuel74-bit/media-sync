import type {
  Alert,
  Node,
  Stream,
  StreamAssignedEvent,
  StreamInspection,
  StreamReservedEvent,
} from "@/types";

type SocketLike = {
  connected: boolean;
  connect: () => void;
  disconnect: () => void;
  on: (event: string, listener: (...args: unknown[]) => void) => void;
};

type EventMap = {
  connection: boolean;
  "stream.synced": Stream;
  "stream.removed": string;
  "stream.reserved": StreamReservedEvent;
  "stream.assigned": StreamAssignedEvent;
  "stream.unassigned": string;
  "alert.created": Alert;
  "alert.updated": Alert;
  "alert.resolved": Alert;
  "stream.inspected": StreamInspection;
  "node.registered": Node;
};

type Listener<K extends keyof EventMap> = (payload: EventMap[K]) => void;
type UnknownListener = (payload: unknown) => void;

class WebSocketManager {
  private socket: SocketLike | null = null;
  private listeners = new Map<keyof EventMap, Set<UnknownListener>>();
  private isConnected = false;
  private scriptPromise: Promise<void> | null = null;

  get connected(): boolean {
    return this.isConnected;
  }

  connect(): void {
    void this.ensureConnected();
  }

  on<K extends keyof EventMap>(event: K, listener: Listener<K>): () => void {
    const wrapped: UnknownListener = (payload) =>
      listener(payload as EventMap[K]);
    const eventListeners =
      this.listeners.get(event) ?? new Set<UnknownListener>();
    eventListeners.add(wrapped);
    this.listeners.set(event, eventListeners);

    return () => {
      eventListeners.delete(wrapped);
    };
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.isConnected = false;
  }

  private async ensureConnected(): Promise<void> {
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
      this.isConnected = true;
      this.emit("connection", true);
    });
    this.socket.on("disconnect", () => {
      this.isConnected = false;
      this.emit("connection", false);
    });

    this.forwardSocketEvent("stream.synced");
    this.forwardSocketEvent("stream.removed");
    this.forwardSocketEvent("stream.reserved");
    this.forwardSocketEvent("stream.assigned");
    this.forwardSocketEvent("stream.unassigned");
    this.forwardSocketEvent("alert.created");
    this.forwardSocketEvent("alert.updated");
    this.forwardSocketEvent("alert.resolved");
    this.forwardSocketEvent("stream.inspected");
    this.forwardSocketEvent("node.registered");
  }

  private forwardSocketEvent<K extends Exclude<keyof EventMap, "connection">>(
    event: K,
  ): void {
    this.socket?.on(event, (payload) =>
      this.emit(event, payload as EventMap[K]),
    );
  }

  private ensureSocketClientLoaded(baseUrl: string): Promise<void> {
    if (typeof window === "undefined" || typeof window.io === "function") {
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
        existing.addEventListener("load", () => resolve(), { once: true });
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

  private emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
    this.listeners.get(event)?.forEach((listener) => listener(data));
  }
}

export const wsManager = new WebSocketManager();

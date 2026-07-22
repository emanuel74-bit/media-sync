import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { StreamReservedEvent } from "@/types";
import { wsManager } from "@/services/websocket";

type SocketListener = (...args: unknown[]) => void;

describe("websocket event contract", () => {
  let socketListeners: Map<string, SocketListener>;

  beforeEach(() => {
    wsManager.disconnect();
    socketListeners = new Map<string, SocketListener>();
    window.io = vi.fn(() => ({
      connected: true,
      connect: vi.fn(),
      disconnect: vi.fn(),
      on: (event: string, listener: SocketListener) => {
        socketListeners.set(event, listener);
      },
    }));
  });

  afterEach(() => {
    wsManager.disconnect();
    delete window.io;
  });

  it("forwards stream.reserved with its public payload", async () => {
    const payload: StreamReservedEvent = {
      streamName: "camera-1",
      ingestNode: "ingest-1",
      expiresAt: "2026-07-22T12:00:00.000Z",
    };
    const listener = vi.fn();
    const unsubscribe = wsManager.on("stream.reserved", listener);

    wsManager.connect();
    await vi.waitFor(() => {
      expect(socketListeners.has("stream.reserved")).toBe(true);
    });
    socketListeners.get("stream.reserved")?.(payload);

    expect(listener).toHaveBeenCalledWith(payload);
    unsubscribe();
  });
});

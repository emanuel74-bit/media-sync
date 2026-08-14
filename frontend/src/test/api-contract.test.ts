import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { alertsApi, ingestApi, nodesApi, streamsApi } from "@/services/api";

const fetchMock = vi.fn<typeof fetch>();

function response(body?: unknown, status = 200): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("backend REST contract", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("assigns streams with the backend nodeId field", async () => {
    fetchMock.mockResolvedValue(
      response({ name: "camera/a", assignedNode: "cluster-1" }),
    );

    await streamsApi.assign("camera/a", "cluster-1");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/streams/camera%2Fa/assign",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ nodeId: "cluster-1" }),
      }),
    );
  });

  it("uses the current nodes endpoints", async () => {
    fetchMock
      .mockResolvedValueOnce(response([]))
      .mockResolvedValueOnce(response([]));

    await nodesApi.getAll();
    await nodesApi.getActive();

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/nodes",
      expect.objectContaining({
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/nodes/active",
      expect.objectContaining({
        headers: { "Content-Type": "application/json" },
      }),
    );
  });

  it("reserves an ingest stream through the reserve endpoint", async () => {
    fetchMock.mockResolvedValue(
      response({
        name: "event-1",
        ingestNode: "ingest-1",
        publishUrl: "rtsp://publish:secret@ingest:8554/event-1",
        publishToken: "secret",
        expiresAt: "2026-07-21T10:00:00.000Z",
      }),
    );

    const reservation = await ingestApi.reserve("event-1");

    expect(reservation.name).toBe("event-1");
    expect(reservation.ingestNode).toBe("ingest-1");
    expect(reservation.publishToken).toBe("secret");
    expect(reservation.publishUrl).toContain(`:${reservation.publishToken}@`);
    expect(reservation.expiresAt).toBe("2026-07-21T10:00:00.000Z");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/ingest/streams",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "event-1" }),
      }),
    );
  });

  it("accepts an empty successful response when deleting", async () => {
    fetchMock.mockResolvedValue(response());

    await expect(streamsApi.delete("old-stream")).resolves.toBeUndefined();
  });

  it("targets alerts by their domain id", async () => {
    fetchMock.mockResolvedValue(response(null));

    await alertsApi.resolve("alert/1");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/alerts/alert%2F1/resolve",
      expect.objectContaining({ method: "PATCH" }),
    );
  });

  it("surfaces backend validation messages", async () => {
    fetchMock.mockResolvedValue(
      response({ message: ["name must be a string", "name is invalid"] }, 400),
    );

    await expect(ingestApi.reserve("bad name")).rejects.toThrow(
      "name must be a string, name is invalid",
    );
  });
});

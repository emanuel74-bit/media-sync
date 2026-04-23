import { Logger } from "@nestjs/common";

import { MediaMtxClient } from "@/infrastructure";
import { MediaMtxStreamInfo } from "@/infrastructure";
import { StreamCollectionService } from "@/infrastructure/media-mtx/services/listing/stream-collection.service";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeStream = (name: string): MediaMtxStreamInfo => ({
    name,
    source: `rtsps://ingest:8322/${name}`,
    status: "ready",
});

const makeClient = (
    streams: MediaMtxStreamInfo[] | Error,
): jest.Mocked<Pick<MediaMtxClient, "listPaths">> => ({
    listPaths: jest
        .fn()
        .mockImplementation(() =>
            streams instanceof Error ? Promise.reject(streams) : Promise.resolve(streams),
        ),
});

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe("StreamCollectionService", () => {
    let service: StreamCollectionService;
    let warnSpy: jest.SpyInstance;

    beforeEach(() => {
        service = new StreamCollectionService();
        // Suppress logger output in tests; verify calls where relevant
        warnSpy = jest.spyOn(Logger.prototype, "warn").mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    // -----------------------------------------------------------------------
    // Empty client list
    // -----------------------------------------------------------------------
    describe("collectFromClients — empty input", () => {
        it("returns an empty array when no clients are provided", async () => {
            const result = await service.collectFromClients([]);
            expect(result).toEqual([]);
        });

        it("does not call any client when the list is empty", async () => {
            const client = makeClient([makeStream("s1")]);
            // We pass an empty array, so the client above should never be touched
            await service.collectFromClients([]);
            expect(client.listPaths).not.toHaveBeenCalled();
        });
    });

    // -----------------------------------------------------------------------
    // Single-client happy path
    // -----------------------------------------------------------------------
    describe("collectFromClients — single client success", () => {
        it("returns all streams from the client", async () => {
            const client = makeClient([makeStream("live"), makeStream("cam")]);
            const result = await service.collectFromClients([client as unknown as MediaMtxClient]);
            expect(result).toHaveLength(2);
            expect(result.map((s) => s.name)).toEqual(["live", "cam"]);
        });

        it("returns an empty array when the client reports no streams", async () => {
            const client = makeClient([]);
            const result = await service.collectFromClients([client as unknown as MediaMtxClient]);
            expect(result).toEqual([]);
        });
    });

    // -----------------------------------------------------------------------
    // Multi-client aggregation
    // -----------------------------------------------------------------------
    describe("collectFromClients — multiple clients", () => {
        it("aggregates streams from all clients into one array", async () => {
            const c1 = makeClient([makeStream("stream-1"), makeStream("stream-2")]);
            const c2 = makeClient([makeStream("stream-3")]);
            const c3 = makeClient([makeStream("stream-4"), makeStream("stream-5")]);

            const result = await service.collectFromClients([
                c1 as unknown as MediaMtxClient,
                c2 as unknown as MediaMtxClient,
                c3 as unknown as MediaMtxClient,
            ]);

            expect(result).toHaveLength(5);
            expect(result.map((s) => s.name)).toEqual([
                "stream-1",
                "stream-2",
                "stream-3",
                "stream-4",
                "stream-5",
            ]);
        });

        it("calls each client exactly once", async () => {
            const c1 = makeClient([]);
            const c2 = makeClient([]);
            await service.collectFromClients([
                c1 as unknown as MediaMtxClient,
                c2 as unknown as MediaMtxClient,
            ]);
            expect(c1.listPaths).toHaveBeenCalledTimes(1);
            expect(c2.listPaths).toHaveBeenCalledTimes(1);
        });
    });

    // -----------------------------------------------------------------------
    // Per-client error isolation
    // -----------------------------------------------------------------------
    describe("collectFromClients — client failure isolation", () => {
        it("skips a failing client and returns streams from healthy clients", async () => {
            const healthy = makeClient([makeStream("ok-stream")]);
            const broken = makeClient(new Error("connection refused"));

            const result = await service.collectFromClients([
                broken as unknown as MediaMtxClient,
                healthy as unknown as MediaMtxClient,
            ]);

            expect(result).toHaveLength(1);
            expect(result[0].name).toBe("ok-stream");
        });

        it("returns an empty array when all clients fail", async () => {
            const broken1 = makeClient(new Error("timeout"));
            const broken2 = makeClient(new Error("network error"));

            const result = await service.collectFromClients([
                broken1 as unknown as MediaMtxClient,
                broken2 as unknown as MediaMtxClient,
            ]);

            expect(result).toEqual([]);
        });

        it("does not throw when a client rejects", async () => {
            const broken = makeClient(new Error("boom"));
            await expect(
                service.collectFromClients([broken as unknown as MediaMtxClient]),
            ).resolves.toEqual([]);
        });

        it("logs a warn for each failing client", async () => {
            const broken1 = makeClient(new Error("timeout"));
            const broken2 = makeClient(new Error("refused"));

            await service.collectFromClients([
                broken1 as unknown as MediaMtxClient,
                broken2 as unknown as MediaMtxClient,
            ]);

            expect(warnSpy).toHaveBeenCalledTimes(2);
            expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("timeout"));
            expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("refused"));
        });

        it("includes the error message from non-Error rejections in the warn log", async () => {
            const brokenClient = {
                listPaths: jest.fn().mockRejectedValue("raw string error"),
            } as unknown as MediaMtxClient;

            await service.collectFromClients([brokenClient]);

            expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("raw string error"));
        });

        it("still collects from remaining clients after a mid-list failure", async () => {
            const first = makeClient([makeStream("first")]);
            const broken = makeClient(new Error("mid-failure"));
            const last = makeClient([makeStream("last")]);

            const result = await service.collectFromClients([
                first as unknown as MediaMtxClient,
                broken as unknown as MediaMtxClient,
                last as unknown as MediaMtxClient,
            ]);

            expect(result.map((s) => s.name)).toEqual(["first", "last"]);
        });
    });
});

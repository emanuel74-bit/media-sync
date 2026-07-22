import { Test, TestingModule } from "@nestjs/testing";

import { StreamStatus } from "@/common";
import { SyncContext } from "@/sync/domain";
import { Stream, StreamsFacadeService } from "@/streams";
import { StreamStalenessService } from "@/sync/services/workflows/stream-staleness.service";

const makeStream = (overrides: Partial<Stream> = {}): Stream => ({
    name: "stream-1",
    source: "rtsp://source",
    status: StreamStatus.DISCOVERED,
    metadata: {},
    isEnabled: true,
    isManual: false,
    activeConsumers: 0,
    assignedNode: null,
    assignedAt: null,
    lastSeenAt: new Date(),
    lastSyncedAt: null,
    lastError: null,
    ...overrides,
});

const makeContext = (overrides: Partial<SyncContext> = {}): SyncContext => ({
    ingestList: [],
    clusterList: [],
    ingestNames: new Set(),
    clusterNames: new Set(),
    ingestNodeIds: new Set(),
    observedIngestNodeIds: new Set(),
    nodeIds: ["node-1"],
    allStreams: [],
    ...overrides,
});

describe("StreamStalenessService", () => {
    let service: StreamStalenessService;
    let streams: jest.Mocked<StreamsFacadeService>;

    beforeEach(async () => {
        streams = {
            markStale: jest.fn(),
            teardownClusterPipeline: jest.fn(),
            expireReservation: jest.fn(),
        } as unknown as jest.Mocked<StreamsFacadeService>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                StreamStalenessService,
                { provide: StreamsFacadeService, useValue: streams },
            ],
        }).compile();

        service = module.get<StreamStalenessService>(StreamStalenessService);
    });

    it("marks only non-manual streams that disappeared from ingest", async () => {
        const stale = makeStream({ name: "stale", isManual: false });
        const stillPresent = makeStream({ name: "ingest", isManual: false });
        const manual = makeStream({ name: "manual", isManual: true });
        streams.markStale.mockResolvedValue(undefined);

        await service.execute(
            makeContext({
                allStreams: [stale, stillPresent, manual],
                ingestNames: new Set(["ingest"]),
            }),
        );

        expect(streams.markStale).toHaveBeenCalledTimes(1);
        expect(streams.markStale).toHaveBeenCalledWith("stale");
    });

    it("marks stale streams and tears down the cluster pipeline when the stream exists in cluster", async () => {
        const stream = makeStream();
        streams.markStale.mockResolvedValue(undefined);
        streams.teardownClusterPipeline.mockResolvedValue(undefined);

        await service.execute(
            makeContext({ allStreams: [stream], clusterNames: new Set(["stream-1"]) }),
        );

        expect(streams.markStale).toHaveBeenCalledWith("stream-1");
        expect(streams.teardownClusterPipeline).toHaveBeenCalledWith(stream);
    });

    it("does not tear down a cluster pipeline when the stream is already absent", async () => {
        const stream = makeStream();
        streams.markStale.mockResolvedValue(undefined);

        await service.execute(makeContext({ allStreams: [stream] }));

        expect(streams.teardownClusterPipeline).not.toHaveBeenCalled();
    });

    it("never marks a RESERVED stream stale (it is legitimately absent from ingest)", async () => {
        const reserved = makeStream({
            name: "reserved",
            status: StreamStatus.RESERVED,
            reservedUntil: new Date(Date.now() + 60_000),
        });

        await service.execute(makeContext({ allStreams: [reserved] }));

        expect(streams.markStale).not.toHaveBeenCalled();
        expect(streams.expireReservation).not.toHaveBeenCalled();
    });

    it("expires (removes) a RESERVED stream whose reservedUntil has passed", async () => {
        const expired = makeStream({
            name: "expired",
            status: StreamStatus.RESERVED,
            reservedUntil: new Date(Date.now() - 1),
        });
        streams.expireReservation.mockResolvedValue(true);

        await service.execute(makeContext({ allStreams: [expired] }));

        expect(streams.expireReservation).toHaveBeenCalledWith("expired", expect.any(Date));
        expect(streams.markStale).not.toHaveBeenCalled();
    });

    it("does not delete a reservation promoted after the context snapshot", async () => {
        const expired = makeStream({
            name: "promoted",
            status: StreamStatus.RESERVED,
            reservedUntil: new Date(Date.now() - 1),
        });
        streams.expireReservation.mockResolvedValue(false);

        await expect(
            service.execute(makeContext({ allStreams: [expired] })),
        ).resolves.toBeUndefined();

        expect(streams.expireReservation).toHaveBeenCalledWith("promoted", expect.any(Date));
    });

    it("swallows a reservation-expiry failure", async () => {
        const expired = makeStream({
            name: "expired",
            status: StreamStatus.RESERVED,
            reservedUntil: new Date(Date.now() - 1),
        });
        const warnSpy = jest.spyOn((service as any).logger, "warn").mockImplementation();
        streams.expireReservation.mockRejectedValue(new Error("db down"));

        await expect(
            service.execute(makeContext({ allStreams: [expired] })),
        ).resolves.toBeUndefined();

        expect(warnSpy).toHaveBeenCalledWith(
            "Failed to expire reservation expired",
            expect.any(Error),
        );
    });

    it("does not mark a stream stale when its active ingest node failed observation", async () => {
        const stream = makeStream({ ingestNode: "ingest-a" });

        await service.execute(
            makeContext({
                allStreams: [stream],
                ingestNodeIds: new Set(["ingest-a"]),
                observedIngestNodeIds: new Set(),
            }),
        );

        expect(streams.markStale).not.toHaveBeenCalled();
    });

    it("marks a stream stale when its ingest node is no longer active", async () => {
        const stream = makeStream({ ingestNode: "departed-ingest" });

        await service.execute(
            makeContext({
                allStreams: [stream],
                ingestNodeIds: new Set(["ingest-a"]),
                observedIngestNodeIds: new Set(["ingest-a"]),
            }),
        );

        expect(streams.markStale).toHaveBeenCalledWith("stream-1");
    });

    it("logs and swallows stale handling failures", async () => {
        const error = new Error("cleanup failed");
        const warnSpy = jest.spyOn((service as any).logger, "warn").mockImplementation();
        streams.markStale.mockRejectedValue(error);

        await expect(
            service.execute(makeContext({ allStreams: [makeStream()] })),
        ).resolves.toBeUndefined();

        expect(warnSpy).toHaveBeenCalledWith("Failed to remove stale stream stream-1", error);
    });
});

import { Test, TestingModule } from "@nestjs/testing";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { Stream, StreamsFacadeService } from "@/streams";
import { StreamStatus, SystemEventNames } from "@/common";
import { MediaMtxPipelineService } from "@/infrastructure";
import { StreamStalenessService } from "@/sync/services/workflows/stream-staleness.service";

const makeStream = (overrides: Partial<Stream> = {}): Stream => ({
    name: "stream-1",
    source: "rtsp://source",
    status: StreamStatus.DISCOVERED,
    metadata: {},
    isEnabled: true,
    isManual: false,
    activeConsumers: 0,
    assignedPod: null,
    assignedAt: null,
    lastSeenAt: new Date(),
    lastSyncedAt: null,
    lastError: null,
    ...overrides,
});

describe("StreamStalenessService", () => {
    let service: StreamStalenessService;
    let streams: jest.Mocked<StreamsFacadeService>;
    let mediaMtxPipeline: jest.Mocked<MediaMtxPipelineService>;
    let events: jest.Mocked<EventEmitter2>;

    beforeEach(async () => {
        streams = {
            markStale: jest.fn(),
        } as unknown as jest.Mocked<StreamsFacadeService>;

        mediaMtxPipeline = {
            deleteClusterPipeline: jest.fn(),
        } as unknown as jest.Mocked<MediaMtxPipelineService>;

        events = { emit: jest.fn() } as unknown as jest.Mocked<EventEmitter2>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                StreamStalenessService,
                { provide: MediaMtxPipelineService, useValue: mediaMtxPipeline },
                { provide: StreamsFacadeService, useValue: streams },
                { provide: EventEmitter2, useValue: events },
            ],
        }).compile();

        service = module.get<StreamStalenessService>(StreamStalenessService);
    });

    it("marks only non-manual streams that disappeared from ingest", async () => {
        const markStaleSpy = jest.spyOn(service, "markStale").mockResolvedValue();
        const stale = makeStream({ name: "stale", isManual: false });
        const stillPresent = makeStream({ name: "ingest", isManual: false });
        const manual = makeStream({ name: "manual", isManual: true });

        await service.removeStale([stale, stillPresent, manual], new Set(["ingest"]), new Set());

        expect(markStaleSpy).toHaveBeenCalledTimes(1);
        expect(markStaleSpy).toHaveBeenCalledWith(stale, new Set());
    });

    it("marks stale streams and removes the cluster pipeline when the stream exists in cluster", async () => {
        const stream = makeStream();
        streams.markStale.mockResolvedValue(undefined);
        mediaMtxPipeline.deleteClusterPipeline.mockResolvedValue(undefined);

        await service.markStale(stream, new Set(["stream-1"]));

        expect(streams.markStale).toHaveBeenCalledWith("stream-1");
        expect(mediaMtxPipeline.deleteClusterPipeline).toHaveBeenCalledWith("stream-1");
        expect(events.emit).toHaveBeenCalledWith(SystemEventNames.STREAM_REMOVED, "stream-1");
    });

    it("does not remove a cluster pipeline when the stream is already absent", async () => {
        streams.markStale.mockResolvedValue(undefined);

        await service.markStale(makeStream(), new Set());

        expect(mediaMtxPipeline.deleteClusterPipeline).not.toHaveBeenCalled();
        expect(events.emit).not.toHaveBeenCalled();
    });

    it("logs and swallows stale handling failures", async () => {
        const error = new Error("cleanup failed");
        const warnSpy = jest.spyOn((service as any).logger, "warn").mockImplementation();
        streams.markStale.mockRejectedValue(error);

        await expect(service.markStale(makeStream(), new Set())).resolves.toBeUndefined();

        expect(warnSpy).toHaveBeenCalledWith("Failed to remove stale stream stream-1", error);
    });
});

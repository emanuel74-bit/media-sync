import { Test, TestingModule } from "@nestjs/testing";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { MediaMtxPipelineService } from "@/media-mtx";
import { Stream } from "@/streams";
import { SyncContext } from "@/sync";
import { StreamsFacadeService } from "@/streams";
import { SystemEventNames } from "@/system-events";

import { StreamStalenessService } from "../../../../src/sync/services/workflows/stream-staleness.service";

const makeStream = (overrides: Partial<Stream> = {}): Stream =>
    ({
        name: "stream-a",
        source: "rtsp://camera/stream-a",
        status: "ready",
        assignedPod: null,
        isEnabled: true,
        isManual: false,
        metadata: {},
        activeConsumers: 0,
        lastError: null,
        ...overrides,
    }) as Stream;

const makeContext = (allStreams: Stream[] = [makeStream()]): SyncContext =>
    ({
        podIds: ["pod-1"],
        ingestList: [],
        clusterList: [],
        ingestNames: new Set<string>(),
        clusterNames: new Set<string>(),
        allStreams,
    }) as SyncContext;

describe("StreamStalenessService", () => {
    let service: StreamStalenessService;
    let mediaMtxPipeline: jest.Mocked<MediaMtxPipelineService>;
    let streams: jest.Mocked<StreamsFacadeService>;
    let events: jest.Mocked<EventEmitter2>;

    beforeEach(async () => {
        mediaMtxPipeline = {
            deleteClusterPipeline: jest.fn(),
        } as unknown as jest.Mocked<MediaMtxPipelineService>;
        streams = {
            markStale: jest.fn(),
        } as unknown as jest.Mocked<StreamsFacadeService>;
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

    it("marks only non-manual streams missing from ingest names as stale", async () => {
        const spy = jest.spyOn(service, "markStale").mockResolvedValue(undefined);
        const streams = [
            makeStream({ name: "stale-auto", isManual: false }),
            makeStream({ name: "active-auto", isManual: false }),
            makeStream({ name: "manual", isManual: true }),
        ];

        await service.removeStale(streams, new Set(["active-auto"]), new Set());

        expect(spy).toHaveBeenCalledTimes(1);
        expect(spy).toHaveBeenCalledWith(streams[0], new Set());
    });

    it("marks a stream stale, removes the cluster pipeline, and emits STREAM_REMOVED", async () => {
        const stream = makeStream();
        streams.markStale.mockResolvedValue(undefined);
        mediaMtxPipeline.deleteClusterPipeline.mockResolvedValue(undefined);

        await service.markStale(stream, new Set([stream.name]));

        expect(streams.markStale).toHaveBeenCalledWith(stream.name);
        expect(mediaMtxPipeline.deleteClusterPipeline).toHaveBeenCalledWith(stream.name);
        expect(events.emit).toHaveBeenCalledWith(SystemEventNames.STREAM_REMOVED, stream.name);
    });

    it("skips pipeline deletion and event emission when the stream is not in the cluster set", async () => {
        const stream = makeStream();
        streams.markStale.mockResolvedValue(undefined);

        await service.markStale(stream, new Set(["other-stream"]));

        expect(mediaMtxPipeline.deleteClusterPipeline).not.toHaveBeenCalled();
        expect(events.emit).not.toHaveBeenCalled();
    });

    it("swallows errors while marking a stream stale", async () => {
        streams.markStale.mockRejectedValue(new Error("boom"));

        await expect(service.markStale(makeStream(), new Set())).resolves.toBeUndefined();
    });

    it("delegates execute to removeStale", async () => {
        const ctx = makeContext();
        const spy = jest.spyOn(service, "removeStale").mockResolvedValue(undefined);

        await service.execute(ctx);

        expect(spy).toHaveBeenCalledWith(ctx.allStreams, ctx.ingestNames, ctx.clusterNames);
    });
});

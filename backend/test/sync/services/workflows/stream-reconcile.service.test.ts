import { Test, TestingModule } from "@nestjs/testing";

import { MediaMtxPipelineService } from "@/media-mtx";
import { Stream } from "@/streams";
import { SyncContext } from "@/sync";
import { StreamsFacadeService } from "@/streams";

import { StreamReconcileService } from "../../../../src/sync/services/workflows/stream-reconcile.service";

const makeStream = (overrides: Partial<Stream> = {}): Stream =>
    ({
        name: "stream-a",
        source: "rtsp://camera/stream-a",
        status: "ready",
        assignedPod: null,
        isEnabled: true,
        isManual: true,
        metadata: {},
        activeConsumers: 0,
        lastError: null,
        ...overrides,
    }) as Stream;

const makeContext = (allStreams: Stream[] = [makeStream()]): SyncContext =>
    ({
        podIds: ["pod-1", "pod-2"],
        ingestList: [],
        clusterList: [],
        ingestNames: new Set<string>(),
        clusterNames: new Set<string>(),
        allStreams,
    }) as SyncContext;

describe("StreamReconcileService", () => {
    let service: StreamReconcileService;
    let mediaMtxPipeline: jest.Mocked<MediaMtxPipelineService>;
    let streams: jest.Mocked<StreamsFacadeService>;

    beforeEach(async () => {
        mediaMtxPipeline = {
            createClusterPullPipeline: jest.fn(),
        } as unknown as jest.Mocked<MediaMtxPipelineService>;
        streams = {
            ensureAssigned: jest.fn(),
        } as unknown as jest.Mocked<StreamsFacadeService>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                StreamReconcileService,
                { provide: MediaMtxPipelineService, useValue: mediaMtxPipeline },
                { provide: StreamsFacadeService, useValue: streams },
            ],
        }).compile();

        service = module.get<StreamReconcileService>(StreamReconcileService);
    });

    it("reconciles only manual enabled streams in reconcileAll", async () => {
        const spy = jest.spyOn(service, "reconcileStream").mockResolvedValue(undefined);
        const streams = [
            makeStream({ name: "manual-enabled", isManual: true, isEnabled: true }),
            makeStream({ name: "manual-disabled", isManual: true, isEnabled: false }),
            makeStream({ name: "auto", isManual: false }),
        ];

        await service.reconcileAll(streams, new Set(), ["pod-1"]);

        expect(spy).toHaveBeenCalledTimes(1);
        expect(spy).toHaveBeenCalledWith(streams[0], new Set(), ["pod-1"]);
    });

    it("ensures assignment before reconciling the cluster pipeline", async () => {
        const stream = makeStream();

        await service.reconcileStream(stream, new Set(), ["pod-1", "pod-2"]);

        expect(streams.ensureAssigned).toHaveBeenCalledWith(stream.name, [
            "pod-1",
            "pod-2",
        ]);
    });

    it("creates a cluster pull pipeline when the stream is missing from the cluster", async () => {
        const stream = makeStream();

        await service.reconcileStream(stream, new Set(["other-stream"]), ["pod-1"]);

        expect(mediaMtxPipeline.createClusterPullPipeline).toHaveBeenCalledWith({
            name: stream.name,
            source: stream.source,
            status: stream.status,
        });
    });

    it("skips pipeline creation when the stream already exists in the cluster", async () => {
        const stream = makeStream();

        await service.reconcileStream(stream, new Set([stream.name]), ["pod-1"]);

        expect(mediaMtxPipeline.createClusterPullPipeline).not.toHaveBeenCalled();
    });

    it("swallows pipeline creation errors", async () => {
        mediaMtxPipeline.createClusterPullPipeline.mockRejectedValue(new Error("boom"));

        await expect(
            service.reconcileStream(makeStream(), new Set(["other-stream"]), ["pod-1"]),
        ).resolves.toBeUndefined();
    });

    it("delegates execute to reconcileAll", async () => {
        const ctx = makeContext();
        const spy = jest.spyOn(service, "reconcileAll").mockResolvedValue(undefined);

        await service.execute(ctx);

        expect(spy).toHaveBeenCalledWith(ctx.allStreams, ctx.clusterNames, ctx.podIds);
    });
});

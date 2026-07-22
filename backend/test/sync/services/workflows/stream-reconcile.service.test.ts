import { Test, TestingModule } from "@nestjs/testing";

import { StreamStatus } from "@/common";
import { SyncContext } from "@/sync/domain";
import { Stream, StreamsFacadeService } from "@/streams";
import { StreamReconcileService } from "@/sync/services/workflows/stream-reconcile.service";

const makeStream = (overrides: Partial<Stream> = {}): Stream => ({
    name: "stream-1",
    source: "rtsp://source",
    status: StreamStatus.DISCOVERED,
    metadata: {},
    isEnabled: true,
    isManual: true,
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
    nodeIds: ["node-1"],
    allStreams: [],
    ...overrides,
});

describe("StreamReconcileService", () => {
    let service: StreamReconcileService;
    let streams: jest.Mocked<StreamsFacadeService>;

    beforeEach(async () => {
        streams = {
            ensureAssigned: jest.fn(),
            buildClusterPipeline: jest.fn(),
        } as unknown as jest.Mocked<StreamsFacadeService>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                StreamReconcileService,
                { provide: StreamsFacadeService, useValue: streams },
            ],
        }).compile();

        service = module.get<StreamReconcileService>(StreamReconcileService);
    });

    it("reconciles only manual enabled streams", async () => {
        const manual = makeStream({ name: "manual-1", isManual: true, isEnabled: true });
        const disabled = makeStream({ name: "manual-2", isManual: true, isEnabled: false });
        const discovered = makeStream({ name: "auto-1", isManual: false });
        streams.ensureAssigned.mockResolvedValue(manual);

        await service.execute(
            makeContext({ allStreams: [manual, disabled, discovered], nodeIds: ["node-1"] }),
        );

        expect(streams.ensureAssigned).toHaveBeenCalledTimes(1);
        expect(streams.ensureAssigned).toHaveBeenCalledWith("manual-1", ["node-1"]);
    });

    it("ensures assignment and creates a cluster pipeline when the stream is missing", async () => {
        const stream = makeStream();
        streams.ensureAssigned.mockResolvedValue(stream);
        streams.buildClusterPipeline.mockResolvedValue(undefined);

        await service.execute(makeContext({ allStreams: [stream], nodeIds: ["node-1"] }));

        expect(streams.ensureAssigned).toHaveBeenCalledWith("stream-1", ["node-1"]);
        expect(streams.buildClusterPipeline).toHaveBeenCalledWith(stream);
    });

    it("skips cluster pipeline creation when the stream already exists in the cluster", async () => {
        const stream = makeStream();
        streams.ensureAssigned.mockResolvedValue(stream);

        await service.execute(
            makeContext({
                allStreams: [stream],
                clusterNames: new Set(["stream-1"]),
                nodeIds: ["node-1"],
            }),
        );

        expect(streams.ensureAssigned).toHaveBeenCalledTimes(1);
        expect(streams.buildClusterPipeline).not.toHaveBeenCalled();
    });

    it("logs and swallows cluster pipeline creation failures", async () => {
        const stream = makeStream();
        const errorSpy = jest.spyOn((service as any).logger, "error").mockImplementation();
        streams.ensureAssigned.mockResolvedValue(stream);
        streams.buildClusterPipeline.mockRejectedValue(new Error("boom"));

        await expect(
            service.execute(makeContext({ allStreams: [stream], nodeIds: ["node-1"] })),
        ).resolves.toBeUndefined();

        expect(errorSpy).toHaveBeenCalledWith("Failed manual sync create for stream-1: boom");
    });
});

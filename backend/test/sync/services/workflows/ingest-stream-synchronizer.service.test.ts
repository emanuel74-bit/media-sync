import { Test, TestingModule } from "@nestjs/testing";

import { PodQueryService } from "@/pods";
import { SyncContext } from "@/sync/domain";
import { PodRole, StreamStatus } from "@/common";
import { Stream, StreamsFacadeService } from "@/streams";
import { IngestStreamSynchronizerService } from "@/sync/services/workflows/ingest-stream-synchronizer.service";

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

const makeContext = (overrides: Partial<SyncContext> = {}): SyncContext => ({
    ingestList: [{ name: "stream-1", source: "rtsp://source", status: "ready" }],
    clusterList: [],
    ingestNames: new Set(["stream-1"]),
    clusterNames: new Set(),
    podIds: ["pod-1"],
    allStreams: [],
    ...overrides,
});

describe("IngestStreamSynchronizerService", () => {
    let service: IngestStreamSynchronizerService;
    let streams: jest.Mocked<StreamsFacadeService>;
    let pods: jest.Mocked<PodQueryService>;

    beforeEach(async () => {
        streams = {
            upsertFromDiscovery: jest.fn().mockResolvedValue(makeStream()),
            ensureAssigned: jest.fn().mockResolvedValue(makeStream({ assignedPod: "pod-1" })),
            deployClusterPipeline: jest.fn(),
        } as unknown as jest.Mocked<StreamsFacadeService>;
        pods = {
            listActivePodIds: jest.fn().mockResolvedValue(["pod-1"]),
        } as unknown as jest.Mocked<PodQueryService>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                IngestStreamSynchronizerService,
                { provide: StreamsFacadeService, useValue: streams },
                { provide: PodQueryService, useValue: pods },
            ],
        }).compile();

        service = module.get<IngestStreamSynchronizerService>(IngestStreamSynchronizerService);
    });

    it("records, assigns, and relays each ingest stream missing from the cluster", async () => {
        const assigned = makeStream({ assignedPod: "pod-1", status: StreamStatus.ASSIGNED });
        streams.ensureAssigned.mockResolvedValue(assigned);

        await service.execute(makeContext());

        expect(streams.upsertFromDiscovery).toHaveBeenCalledWith(
            expect.objectContaining({
                name: "stream-1",
                source: "rtsp://source",
                status: "ready",
                reservedUntil: null,
                isEnabled: true,
            }),
        );
        expect(streams.ensureAssigned).toHaveBeenCalledWith("stream-1", ["pod-1"]);
        expect(streams.deployClusterPipeline).toHaveBeenCalledWith(assigned);
    });

    it("folds track + metadata and sheds the reservation marker when recording", async () => {
        const context = makeContext({
            ingestList: [
                {
                    name: "cam",
                    source: "rtsp://source",
                    status: "ready",
                    ingestPod: "ingest-1",
                    video: { codec: "H264", width: 1920, height: 1080, fps: 30 },
                    audio: { codec: "AAC", channels: 2, sampleRate: 48000 },
                    metadata: { readers: 3 },
                },
            ],
        });

        await service.execute(context);

        expect(streams.upsertFromDiscovery).toHaveBeenCalledWith(
            expect.objectContaining({
                name: "cam",
                ingestPod: "ingest-1",
                reservedUntil: null,
                metadata: {
                    codec: "AAC",
                    width: 1920,
                    height: 1080,
                    fps: 30,
                    channels: 2,
                    sampleRate: 48000,
                    readers: 3,
                },
            }),
        );
    });

    it("skips the relay when the stream already exists in the cluster", async () => {
        await service.execute(makeContext({ clusterNames: new Set(["stream-1"]) }));

        expect(streams.ensureAssigned).toHaveBeenCalledTimes(1);
        expect(streams.deployClusterPipeline).not.toHaveBeenCalled();
    });

    describe("activate — the targeted hook", () => {
        it("records the stream live on its ingest node, assigns, and deploys — no node scan", async () => {
            const assigned = makeStream({ name: "cam", assignedPod: "pod-1" });
            streams.ensureAssigned.mockResolvedValue(assigned);

            await service.activate("ingest-1", "cam");

            expect(streams.upsertFromDiscovery).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: "cam",
                    ingestPod: "ingest-1",
                    reservedUntil: null,
                }),
            );
            expect(pods.listActivePodIds).toHaveBeenCalledWith(PodRole.CLUSTER);
            expect(streams.ensureAssigned).toHaveBeenCalledWith("cam", ["pod-1"]);
            expect(streams.deployClusterPipeline).toHaveBeenCalledWith(assigned);
        });

        it("records but does not assign/deploy when no cluster nodes are live", async () => {
            pods.listActivePodIds.mockResolvedValue([]);

            await service.activate("ingest-1", "cam");

            expect(streams.upsertFromDiscovery).toHaveBeenCalled();
            expect(streams.ensureAssigned).not.toHaveBeenCalled();
            expect(streams.deployClusterPipeline).not.toHaveBeenCalled();
        });
    });
});

import { Test, TestingModule } from "@nestjs/testing";

import { StreamStatus } from "@/common";
import { SyncContext } from "@/sync/domain";
import { Stream, StreamsFacadeService } from "@/streams";
import { IngestStreamDiscoveryService } from "@/sync/services/workflows/ingest-stream-discovery.service";
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
    let ingestDiscovery: jest.Mocked<IngestStreamDiscoveryService>;
    let streams: jest.Mocked<StreamsFacadeService>;

    beforeEach(async () => {
        ingestDiscovery = {
            upsertDiscoveredStream: jest.fn(),
        } as unknown as jest.Mocked<IngestStreamDiscoveryService>;
        streams = {
            ensureAssigned: jest.fn(),
            deployClusterPipeline: jest.fn(),
        } as unknown as jest.Mocked<StreamsFacadeService>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                IngestStreamSynchronizerService,
                { provide: IngestStreamDiscoveryService, useValue: ingestDiscovery },
                { provide: StreamsFacadeService, useValue: streams },
            ],
        }).compile();

        service = module.get<IngestStreamSynchronizerService>(IngestStreamSynchronizerService);
    });

    it("discovers, assigns, and provisions each ingest stream missing from the cluster", async () => {
        const discovered = makeStream();
        const assigned = makeStream({ assignedPod: "pod-1", status: StreamStatus.ASSIGNED });
        ingestDiscovery.upsertDiscoveredStream.mockResolvedValue(discovered);
        streams.ensureAssigned.mockResolvedValue(assigned);
        streams.deployClusterPipeline.mockResolvedValue(assigned);

        await service.execute(makeContext());

        expect(ingestDiscovery.upsertDiscoveredStream).toHaveBeenCalledWith({
            name: "stream-1",
            source: "rtsp://source",
            status: "ready",
        });
        expect(streams.ensureAssigned).toHaveBeenCalledWith("stream-1", ["pod-1"]);
        expect(streams.deployClusterPipeline).toHaveBeenCalledWith(assigned);
    });

    it("skips provisioning when the stream already exists in the cluster", async () => {
        const discovered = makeStream();
        const assigned = makeStream({ assignedPod: "pod-1" });
        ingestDiscovery.upsertDiscoveredStream.mockResolvedValue(discovered);
        streams.ensureAssigned.mockResolvedValue(assigned);

        await service.execute(makeContext({ clusterNames: new Set(["stream-1"]) }));

        expect(streams.ensureAssigned).toHaveBeenCalledTimes(1);
        expect(streams.deployClusterPipeline).not.toHaveBeenCalled();
    });
});

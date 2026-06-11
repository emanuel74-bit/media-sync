import { Test, TestingModule } from "@nestjs/testing";

import { StreamStatus } from "@/common";
import { Stream, StreamsFacadeService } from "@/streams";
import { StreamIngestActivationService } from "@/sync/services/workflows/stream-ingest-activation.service";

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

describe("StreamIngestActivationService", () => {
    let service: StreamIngestActivationService;
    let streams: jest.Mocked<StreamsFacadeService>;

    beforeEach(async () => {
        streams = {
            ensureAssigned: jest.fn(),
            provisionClusterPipeline: jest.fn(),
        } as unknown as jest.Mocked<StreamsFacadeService>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                StreamIngestActivationService,
                { provide: StreamsFacadeService, useValue: streams },
            ],
        }).compile();

        service = module.get<StreamIngestActivationService>(StreamIngestActivationService);
    });

    it("delegates ensurePodAssignment to StreamsFacadeService", async () => {
        const stream = makeStream({ assignedPod: "pod-1", assignedAt: new Date() });
        streams.ensureAssigned.mockResolvedValue(stream);

        const result = await service.ensurePodAssignment(makeStream(), ["pod-1", "pod-2"]);

        expect(result).toBe(stream);
        expect(streams.ensureAssigned).toHaveBeenCalledWith("stream-1", ["pod-1", "pod-2"]);
    });

    it("provisions a cluster pipeline only when the cluster stream is missing", async () => {
        const stream = makeStream();
        streams.provisionClusterPipeline.mockResolvedValue(stream);

        await service.ensureClusterPipeline(stream, new Set());

        expect(streams.provisionClusterPipeline).toHaveBeenCalledWith(stream);
    });

    it("skips provisioning when the cluster already contains the stream", async () => {
        const stream = makeStream();

        await service.ensureClusterPipeline(stream, new Set(["stream-1"]));

        expect(streams.provisionClusterPipeline).not.toHaveBeenCalled();
    });
});

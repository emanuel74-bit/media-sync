import { Test, TestingModule } from "@nestjs/testing";

import { Stream } from "@/streams";
import { StreamsFacadeService } from "@/streams";

import { StreamIngestActivationService } from "../../../../src/sync/services/workflows/stream-ingest-activation.service";

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

    it("delegates pod assignment to StreamAssignmentService", async () => {
        const assigned = makeStream({ assignedPod: "pod-2" });
        streams.ensureAssigned.mockResolvedValue(assigned);

        const result = await service.ensurePodAssignment(makeStream(), ["pod-1", "pod-2"]);

        expect(streams.ensureAssigned).toHaveBeenCalledWith("stream-a", [
            "pod-1",
            "pod-2",
        ]);
        expect(result).toBe(assigned);
    });

    it("provisions the cluster pipeline when the stream is not already present", async () => {
        const stream = makeStream();
        streams.provisionClusterPipeline.mockResolvedValue(stream);

        await service.ensureClusterPipeline(stream, new Set(["other-stream"]));

        expect(streams.provisionClusterPipeline).toHaveBeenCalledWith(stream);
    });

    it("skips provisioning when the stream already exists in the cluster set", async () => {
        const stream = makeStream();

        await service.ensureClusterPipeline(stream, new Set(["stream-a"]));

        expect(streams.provisionClusterPipeline).not.toHaveBeenCalled();
    });
});

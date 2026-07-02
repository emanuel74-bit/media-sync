import { Test, TestingModule } from "@nestjs/testing";

import { StreamStatus } from "@/common";
import { Stream } from "@/streams/domain";
import {
    StreamAssignmentService,
    StreamPipelineService,
    StreamQueryService,
    StreamStatusService,
    StreamsFacadeService,
} from "@/streams/services";

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

describe("StreamsFacadeService", () => {
    let service: StreamsFacadeService;
    let streamQuery: jest.Mocked<StreamQueryService>;
    let streamStatus: jest.Mocked<StreamStatusService>;
    let streamAssignment: jest.Mocked<StreamAssignmentService>;
    let streamPipeline: jest.Mocked<StreamPipelineService>;

    beforeEach(async () => {
        streamQuery = {
            findAll: jest.fn(),
        } as unknown as jest.Mocked<StreamQueryService>;

        streamStatus = {
            upsertFromDiscovery: jest.fn(),
            markStale: jest.fn(),
        } as unknown as jest.Mocked<StreamStatusService>;

        streamAssignment = {
            ensureAssigned: jest.fn(),
        } as unknown as jest.Mocked<StreamAssignmentService>;

        streamPipeline = {
            deploy: jest.fn(),
            build: jest.fn(),
        } as unknown as jest.Mocked<StreamPipelineService>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                StreamsFacadeService,
                { provide: StreamQueryService, useValue: streamQuery },
                { provide: StreamStatusService, useValue: streamStatus },
                { provide: StreamAssignmentService, useValue: streamAssignment },
                { provide: StreamPipelineService, useValue: streamPipeline },
            ],
        }).compile();

        service = module.get<StreamsFacadeService>(StreamsFacadeService);
    });

    it("delegates findAll to StreamQueryService", async () => {
        const streams = [makeStream()];
        streamQuery.findAll.mockResolvedValue(streams);

        const result = await service.findAll();

        expect(result).toBe(streams);
        expect(streamQuery.findAll).toHaveBeenCalledTimes(1);
    });

    it("delegates upsertFromDiscovery to StreamStatusService", async () => {
        const stream = makeStream();
        const discovery = { name: "stream-1", metadata: {}, isEnabled: true };
        streamStatus.upsertFromDiscovery.mockResolvedValue(stream);

        const result = await service.upsertFromDiscovery(discovery);

        expect(result).toBe(stream);
        expect(streamStatus.upsertFromDiscovery).toHaveBeenCalledWith(discovery);
    });

    it("delegates ensureAssigned to StreamAssignmentService", async () => {
        const stream = makeStream({ assignedPod: "pod-1", assignedAt: new Date() });
        streamAssignment.ensureAssigned.mockResolvedValue(stream);

        const result = await service.ensureAssigned("stream-1", ["pod-1", "pod-2"]);

        expect(result).toBe(stream);
        expect(streamAssignment.ensureAssigned).toHaveBeenCalledWith("stream-1", [
            "pod-1",
            "pod-2",
        ]);
    });

    it("delegates provisionClusterPipeline to StreamPipelineService.deploy", async () => {
        const stream = makeStream();
        streamPipeline.deploy.mockResolvedValue(stream);

        const result = await service.provisionClusterPipeline(stream);

        expect(result).toBe(stream);
        expect(streamPipeline.deploy).toHaveBeenCalledWith(stream);
    });

    it("delegates createClusterPipeline to StreamPipelineService.build", async () => {
        const stream = makeStream({ assignedPod: "pod-2" });
        streamPipeline.build.mockResolvedValue(undefined);

        await service.createClusterPipeline(stream);

        expect(streamPipeline.build).toHaveBeenCalledWith(stream);
    });

    it("delegates markStale to StreamStatusService", async () => {
        streamStatus.markStale.mockResolvedValue(undefined);

        await service.markStale("stream-1");

        expect(streamStatus.markStale).toHaveBeenCalledWith("stream-1");
    });
});

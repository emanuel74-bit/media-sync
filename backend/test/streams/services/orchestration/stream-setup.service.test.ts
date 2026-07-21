import { Test, TestingModule } from "@nestjs/testing";

import { PodQueryService } from "@/pods";
import { Stream } from "@/streams/domain";
import { PodRole, StreamStatus } from "@/common";
import {
    StreamAssignmentService,
    StreamCrudService,
    StreamSetupService,
    StreamPipelineService,
    StreamStatusService,
} from "@/streams/services";

const makeStream = (overrides: Partial<Stream> = {}): Stream => ({
    name: "s1",
    source: "rtsp://x",
    status: StreamStatus.CREATED,
    metadata: {},
    isEnabled: true,
    isManual: true,
    activeConsumers: 0,
    ...overrides,
});

describe("StreamSetupService", () => {
    let service: StreamSetupService;
    let streamCrud: jest.Mocked<StreamCrudService>;
    let streamStatus: jest.Mocked<StreamStatusService>;
    let streamAssignment: jest.Mocked<StreamAssignmentService>;
    let podsService: jest.Mocked<PodQueryService>;
    let streamPipeline: jest.Mocked<StreamPipelineService>;

    beforeEach(async () => {
        streamCrud = { create: jest.fn() } as unknown as jest.Mocked<StreamCrudService>;
        streamStatus = {
            markPendingAssignment: jest.fn(),
        } as unknown as jest.Mocked<StreamStatusService>;
        streamAssignment = {
            ensureAssigned: jest.fn(),
        } as unknown as jest.Mocked<StreamAssignmentService>;
        podsService = {
            listActivePodIds: jest.fn(),
        } as unknown as jest.Mocked<PodQueryService>;
        streamPipeline = { deploy: jest.fn() } as unknown as jest.Mocked<StreamPipelineService>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                StreamSetupService,
                { provide: StreamCrudService, useValue: streamCrud },
                { provide: StreamStatusService, useValue: streamStatus },
                { provide: StreamAssignmentService, useValue: streamAssignment },
                { provide: PodQueryService, useValue: podsService },
                { provide: StreamPipelineService, useValue: streamPipeline },
            ],
        }).compile();

        service = module.get<StreamSetupService>(StreamSetupService);
    });

    it("creates, assigns to a cluster pod, and deploys when pods are available", async () => {
        const created = makeStream();
        const assigned = makeStream({ assignedPod: "pod-1", status: StreamStatus.ASSIGNED });
        const deployed = makeStream({ assignedPod: "pod-1", status: StreamStatus.SYNCED });
        streamCrud.create.mockResolvedValue(created);
        podsService.listActivePodIds.mockResolvedValue(["pod-1"]);
        streamAssignment.ensureAssigned.mockResolvedValue(assigned);
        streamPipeline.deploy.mockResolvedValue(deployed);

        const result = await service.onboard({ name: "s1", source: "rtsp://x" });

        expect(podsService.listActivePodIds).toHaveBeenCalledWith(PodRole.CLUSTER);
        expect(streamAssignment.ensureAssigned).toHaveBeenCalledWith("s1", ["pod-1"]);
        expect(streamPipeline.deploy).toHaveBeenCalledWith(assigned);
        expect(result).toBe(deployed);
    });

    it("parks the stream as PENDING_ASSIGNMENT when no cluster pods are available", async () => {
        const created = makeStream();
        const pending = makeStream({ status: StreamStatus.PENDING_ASSIGNMENT });
        streamCrud.create.mockResolvedValue(created);
        podsService.listActivePodIds.mockResolvedValue([]);
        streamStatus.markPendingAssignment.mockResolvedValue(pending);

        const result = await service.onboard({ name: "s1", source: "rtsp://x" });

        expect(streamStatus.markPendingAssignment).toHaveBeenCalledWith(
            "s1",
            "No active cluster pods available",
        );
        expect(streamAssignment.ensureAssigned).not.toHaveBeenCalled();
        expect(streamPipeline.deploy).not.toHaveBeenCalled();
        expect(result).toBe(pending);
    });
});

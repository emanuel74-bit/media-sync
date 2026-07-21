import { Test, TestingModule } from "@nestjs/testing";

import { Stream } from "@/streams/domain";
import { NodeQueryService } from "@/nodes";
import { NodeRole, StreamStatus } from "@/common";
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
    let nodesService: jest.Mocked<NodeQueryService>;
    let streamPipeline: jest.Mocked<StreamPipelineService>;

    beforeEach(async () => {
        streamCrud = { create: jest.fn() } as unknown as jest.Mocked<StreamCrudService>;
        streamStatus = {
            markPendingAssignment: jest.fn(),
        } as unknown as jest.Mocked<StreamStatusService>;
        streamAssignment = {
            ensureAssigned: jest.fn(),
        } as unknown as jest.Mocked<StreamAssignmentService>;
        nodesService = {
            listActiveNodeIds: jest.fn(),
        } as unknown as jest.Mocked<NodeQueryService>;
        streamPipeline = { deploy: jest.fn() } as unknown as jest.Mocked<StreamPipelineService>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                StreamSetupService,
                { provide: StreamCrudService, useValue: streamCrud },
                { provide: StreamStatusService, useValue: streamStatus },
                { provide: StreamAssignmentService, useValue: streamAssignment },
                { provide: NodeQueryService, useValue: nodesService },
                { provide: StreamPipelineService, useValue: streamPipeline },
            ],
        }).compile();

        service = module.get<StreamSetupService>(StreamSetupService);
    });

    it("creates, assigns to a cluster node, and deploys when nodes are available", async () => {
        const created = makeStream();
        const assigned = makeStream({ assignedNode: "node-1", status: StreamStatus.ASSIGNED });
        const deployed = makeStream({ assignedNode: "node-1", status: StreamStatus.SYNCED });
        streamCrud.create.mockResolvedValue(created);
        nodesService.listActiveNodeIds.mockResolvedValue(["node-1"]);
        streamAssignment.ensureAssigned.mockResolvedValue(assigned);
        streamPipeline.deploy.mockResolvedValue(deployed);

        const result = await service.onboard({ name: "s1", source: "rtsp://x" });

        expect(nodesService.listActiveNodeIds).toHaveBeenCalledWith(NodeRole.CLUSTER);
        expect(streamAssignment.ensureAssigned).toHaveBeenCalledWith("s1", ["node-1"]);
        expect(streamPipeline.deploy).toHaveBeenCalledWith(assigned);
        expect(result).toBe(deployed);
    });

    it("parks the stream as PENDING_ASSIGNMENT when no cluster nodes are available", async () => {
        const created = makeStream();
        const pending = makeStream({ status: StreamStatus.PENDING_ASSIGNMENT });
        streamCrud.create.mockResolvedValue(created);
        nodesService.listActiveNodeIds.mockResolvedValue([]);
        streamStatus.markPendingAssignment.mockResolvedValue(pending);

        const result = await service.onboard({ name: "s1", source: "rtsp://x" });

        expect(streamStatus.markPendingAssignment).toHaveBeenCalledWith(
            "s1",
            "No active cluster nodes available",
        );
        expect(streamAssignment.ensureAssigned).not.toHaveBeenCalled();
        expect(streamPipeline.deploy).not.toHaveBeenCalled();
        expect(result).toBe(pending);
    });
});

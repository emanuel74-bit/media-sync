import { Test, TestingModule } from "@nestjs/testing";

import { StreamStatus } from "@/common";
import { StreamsController } from "@/streams/controllers";
import { Stream, StreamAssignmentInfo } from "@/streams/domain";
import {
    StreamAssignmentService,
    StreamCrudService,
    StreamSetupService,
    StreamQueryService,
} from "@/streams/services";

const makeStream = (overrides: Partial<Stream> = {}): Stream => ({
    name: "stream-1",
    source: "rtsp://source",
    status: StreamStatus.DISCOVERED,
    metadata: {},
    isEnabled: true,
    isManual: false,
    activeConsumers: 0,
    assignedNode: null,
    assignedAt: null,
    lastSeenAt: new Date(),
    lastSyncedAt: null,
    lastError: null,
    ...overrides,
});

const makeAssignment = (overrides: Partial<StreamAssignmentInfo> = {}): StreamAssignmentInfo => ({
    name: "stream-1",
    status: StreamStatus.ASSIGNED,
    assignedNode: "node-1",
    assignedAt: new Date(),
    ...overrides,
});

describe("StreamsController", () => {
    let controller: StreamsController;
    let streamQuery: jest.Mocked<StreamQueryService>;
    let streamCrud: jest.Mocked<StreamCrudService>;
    let streamSetup: jest.Mocked<StreamSetupService>;
    let streamAssignment: jest.Mocked<StreamAssignmentService>;

    beforeEach(async () => {
        streamQuery = {
            findAll: jest.fn(),
            getAssignmentInfo: jest.fn(),
            findByName: jest.fn(),
        } as unknown as jest.Mocked<StreamQueryService>;

        streamCrud = {
            update: jest.fn(),
            remove: jest.fn(),
        } as unknown as jest.Mocked<StreamCrudService>;

        streamSetup = {
            onboard: jest.fn(),
        } as unknown as jest.Mocked<StreamSetupService>;

        streamAssignment = {
            assignToNode: jest.fn(),
            clearAssignment: jest.fn(),
        } as unknown as jest.Mocked<StreamAssignmentService>;

        const module: TestingModule = await Test.createTestingModule({
            controllers: [StreamsController],
            providers: [
                { provide: StreamQueryService, useValue: streamQuery },
                { provide: StreamCrudService, useValue: streamCrud },
                { provide: StreamSetupService, useValue: streamSetup },
                { provide: StreamAssignmentService, useValue: streamAssignment },
            ],
        }).compile();

        controller = module.get<StreamsController>(StreamsController);
    });

    it("delegates findAll to StreamQueryService", async () => {
        const streams = [makeStream()];
        streamQuery.findAll.mockResolvedValue(streams);

        const result = await controller.findAll();

        expect(result).toBe(streams);
        expect(streamQuery.findAll).toHaveBeenCalledTimes(1);
    });

    it("maps create dto fields to StreamSetupService.onboard", async () => {
        const created = makeStream();
        streamSetup.onboard.mockResolvedValue(created);

        const result = await controller.create({
            name: "stream-1",
            source: "rtsp://source",
            isEnabled: true,
        });

        expect(result).toBe(created);
        expect(streamSetup.onboard).toHaveBeenCalledWith({
            name: "stream-1",
            source: "rtsp://source",
            isEnabled: true,
        });
    });

    it("delegates assignment lookup to StreamQueryService", async () => {
        const assignments = [makeAssignment()];
        streamQuery.getAssignmentInfo.mockResolvedValue(assignments);

        const result = await controller.assignment();

        expect(result).toBe(assignments);
        expect(streamQuery.getAssignmentInfo).toHaveBeenCalledTimes(1);
    });

    it("delegates findOne to StreamQueryService.findByName", async () => {
        const stream = makeStream();
        streamQuery.findByName.mockResolvedValue(stream);

        const result = await controller.findOne("stream-1");

        expect(result).toBe(stream);
        expect(streamQuery.findByName).toHaveBeenCalledWith("stream-1");
    });

    it("maps update dto fields to StreamCrudService.update", async () => {
        const updated = makeStream({ status: StreamStatus.SYNCED, isEnabled: false });
        streamCrud.update.mockResolvedValue(updated);

        const result = await controller.update("stream-1", {
            source: "rtsp://updated",
            isEnabled: false,
            status: StreamStatus.SYNCED,
        });

        expect(result).toBe(updated);
        expect(streamCrud.update).toHaveBeenCalledWith("stream-1", {
            source: "rtsp://updated",
            isEnabled: false,
            status: StreamStatus.SYNCED,
        });
    });

    it("delegates remove to StreamCrudService.remove", async () => {
        streamCrud.remove.mockResolvedValue(undefined);

        await controller.remove("stream-1");

        expect(streamCrud.remove).toHaveBeenCalledWith("stream-1");
    });

    it("delegates assign to StreamAssignmentService.assignToNode", async () => {
        const assigned = makeStream({ assignedNode: "node-1", assignedAt: new Date() });
        streamAssignment.assignToNode.mockResolvedValue(assigned);

        const result = await controller.assign("stream-1", { nodeId: "node-1" });

        expect(result).toBe(assigned);
        expect(streamAssignment.assignToNode).toHaveBeenCalledWith("stream-1", "node-1");
    });

    it("delegates unassign to StreamAssignmentService.clearAssignment", async () => {
        const unassigned = makeStream({ assignedNode: null, assignedAt: null });
        streamAssignment.clearAssignment.mockResolvedValue(unassigned);

        const result = await controller.unassign("stream-1");

        expect(result).toBe(unassigned);
        expect(streamAssignment.clearAssignment).toHaveBeenCalledWith("stream-1");
    });
});

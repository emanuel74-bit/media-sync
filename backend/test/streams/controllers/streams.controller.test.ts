import { Test, TestingModule } from "@nestjs/testing";

import { StreamStatus } from "@/common";
import { StreamsController } from "@/streams/controllers";
import { PublicStream, Stream, StreamAssignmentInfo } from "@/streams/domain";
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
    ingestNode: "ingest-1",
    reservedUntil: new Date(),
    publishToken: "internal-publish-secret",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

function expectPublicStream(result: PublicStream, stream: Stream): void {
    expect(result).toEqual({
        name: stream.name,
        source: stream.source,
        status: stream.status,
        metadata: stream.metadata,
        isEnabled: stream.isEnabled,
        lastSeenAt: stream.lastSeenAt,
        lastSyncedAt: stream.lastSyncedAt,
        lastError: stream.lastError,
        activeConsumers: stream.activeConsumers,
        isManual: stream.isManual,
        ingestNode: stream.ingestNode,
        reservedUntil: stream.reservedUntil,
        assignedNode: stream.assignedNode,
        assignedAt: stream.assignedAt,
        createdAt: stream.createdAt,
        updatedAt: stream.updatedAt,
    });
    expect(result).not.toHaveProperty("publishToken");
}

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

    it("projects token-bearing findAll results into public streams", async () => {
        const streams = [makeStream({ status: StreamStatus.RESERVED })];
        streamQuery.findAll.mockResolvedValue(streams);

        const result = await controller.findAll();

        expect(result).toHaveLength(1);
        expectPublicStream(result[0], streams[0]);
        expect(streamQuery.findAll).toHaveBeenCalledTimes(1);
    });

    it("preserves an empty findAll result", async () => {
        streamQuery.findAll.mockResolvedValue([]);

        const result = await controller.findAll();

        expect(result).toEqual([]);
        expect(streamQuery.findAll).toHaveBeenCalledTimes(1);
    });

    it("maps create dto fields and projects the token-bearing result", async () => {
        const created = makeStream({ isManual: true });
        streamSetup.onboard.mockResolvedValue(created);

        const result = await controller.create({
            name: "stream-1",
            source: "rtsp://source",
            isEnabled: true,
        });

        expectPublicStream(result, created);
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

    it("projects a token-bearing findOne result into a public stream", async () => {
        const stream = makeStream();
        streamQuery.findByName.mockResolvedValue(stream);

        const result = await controller.findOne("stream-1");

        expect(result).not.toBeNull();
        expectPublicStream(result!, stream);
        expect(streamQuery.findByName).toHaveBeenCalledWith("stream-1");
    });

    it("preserves a null findOne result", async () => {
        streamQuery.findByName.mockResolvedValue(null);

        const result = await controller.findOne("missing-stream");

        expect(result).toBeNull();
        expect(streamQuery.findByName).toHaveBeenCalledWith("missing-stream");
    });

    it("maps update dto fields and projects the token-bearing result", async () => {
        const updated = makeStream({ status: StreamStatus.SYNCED, isEnabled: false });
        streamCrud.update.mockResolvedValue(updated);

        const result = await controller.update("stream-1", {
            source: "rtsp://updated",
            isEnabled: false,
            status: StreamStatus.SYNCED,
        });

        expectPublicStream(result, updated);
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

    it("delegates assign and projects the token-bearing result", async () => {
        const assigned = makeStream({
            status: StreamStatus.ASSIGNED,
            assignedNode: "node-1",
            assignedAt: new Date(),
        });
        streamAssignment.assignToNode.mockResolvedValue(assigned);

        const result = await controller.assign("stream-1", { nodeId: "node-1" });

        expectPublicStream(result, assigned);
        expect(streamAssignment.assignToNode).toHaveBeenCalledWith("stream-1", "node-1");
    });

    it("delegates unassign and projects the token-bearing result", async () => {
        const unassigned = makeStream({
            status: StreamStatus.PENDING_ASSIGNMENT,
            assignedNode: null,
            assignedAt: null,
        });
        streamAssignment.clearAssignment.mockResolvedValue(unassigned);

        const result = await controller.unassign("stream-1");

        expectPublicStream(result, unassigned);
        expect(streamAssignment.clearAssignment).toHaveBeenCalledWith("stream-1");
    });
});

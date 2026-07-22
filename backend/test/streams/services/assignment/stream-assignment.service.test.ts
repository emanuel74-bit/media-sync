import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { Stream } from "@/streams/domain";
import { StreamRepository } from "@/streams/repositories";
import { StreamStatus, SystemEventNames } from "@/common";
import { StreamAssignmentService, StreamStatusService } from "@/streams/services";

const makeStream = (overrides: Partial<Stream> = {}): Stream => ({
    name: "s1",
    source: "rtsp://x",
    status: StreamStatus.ASSIGNED,
    metadata: {},
    isEnabled: true,
    isManual: false,
    activeConsumers: 0,
    assignedNode: null,
    assignedAt: null,
    ...overrides,
});

describe("StreamAssignmentService", () => {
    let service: StreamAssignmentService;
    let repo: jest.Mocked<StreamRepository>;
    let streamStatus: jest.Mocked<StreamStatusService>;
    let events: jest.Mocked<EventEmitter2>;

    beforeEach(async () => {
        repo = {
            findByName: jest.fn(),
        } as unknown as jest.Mocked<StreamRepository>;
        streamStatus = {
            markAssigned: jest.fn(),
            markUnassigned: jest.fn(),
        } as unknown as jest.Mocked<StreamStatusService>;
        events = { emit: jest.fn() } as unknown as jest.Mocked<EventEmitter2>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                StreamAssignmentService,
                { provide: StreamRepository, useValue: repo },
                { provide: StreamStatusService, useValue: streamStatus },
                { provide: EventEmitter2, useValue: events },
            ],
        }).compile();

        service = module.get<StreamAssignmentService>(StreamAssignmentService);
    });

    describe("assignToNode", () => {
        it("transitions to ASSIGNED and emits stream.assigned", async () => {
            const assignedAt = new Date();
            const stream = makeStream({ assignedNode: "node-1", assignedAt });
            streamStatus.markAssigned.mockResolvedValue(stream);

            const result = await service.assignToNode("s1", "node-1");

            expect(result).toBe(stream);
            expect(streamStatus.markAssigned).toHaveBeenCalledWith("s1", "node-1");
            expect(events.emit).toHaveBeenCalledWith(SystemEventNames.STREAM_ASSIGNED, {
                streamName: "s1",
                nodeId: "node-1",
                assignedAt,
            });
        });

        it("does not emit when the lifecycle authority rejects the assignment", async () => {
            streamStatus.markAssigned.mockRejectedValue(new NotFoundException());

            await expect(service.assignToNode("missing", "node-1")).rejects.toBeInstanceOf(
                NotFoundException,
            );
            expect(events.emit).not.toHaveBeenCalled();
        });
    });

    describe("clearAssignment", () => {
        it("moves to PENDING_ASSIGNMENT and emits stream.unassigned", async () => {
            const stream = makeStream({
                status: StreamStatus.PENDING_ASSIGNMENT,
                assignedNode: null,
            });
            streamStatus.markUnassigned.mockResolvedValue(stream);

            const result = await service.clearAssignment("s1");

            expect(result).toBe(stream);
            expect(streamStatus.markUnassigned).toHaveBeenCalledWith(
                "s1",
                "Stream is not assigned to a cluster node",
            );
            expect(events.emit).toHaveBeenCalledWith(SystemEventNames.STREAM_UNASSIGNED, "s1");
        });
    });

    describe("ensureAssigned", () => {
        it("keeps the current assignment when the node is still a candidate", async () => {
            const stream = makeStream({ assignedNode: "node-1" });
            repo.findByName.mockResolvedValue(stream);

            const result = await service.ensureAssigned("s1", ["node-1", "node-2"]);

            expect(result).toBe(stream);
            expect(streamStatus.markAssigned).not.toHaveBeenCalled();
        });

        it("restores ASSIGNED when a discovered stream still points to a live node", async () => {
            const discovered = makeStream({
                status: StreamStatus.DISCOVERED,
                assignedNode: "node-1",
            });
            const assigned = makeStream({ assignedNode: "node-1" });
            repo.findByName.mockResolvedValue(discovered);
            streamStatus.markAssigned.mockResolvedValue(assigned);

            await expect(service.ensureAssigned("s1", ["node-1", "node-2"])).resolves.toBe(
                assigned,
            );

            expect(streamStatus.markAssigned).toHaveBeenCalledWith("s1", "node-1");
        });

        it("hashes the name to a candidate node and assigns when unassigned", async () => {
            const unassigned = makeStream({ assignedNode: null });
            const reassigned = makeStream({ assignedNode: "node-1", assignedAt: new Date() });
            repo.findByName.mockResolvedValue(unassigned);
            streamStatus.markAssigned.mockResolvedValue(reassigned);

            const result = await service.ensureAssigned("s1", ["node-1", "node-2"]);

            const [name, chosenNode] = streamStatus.markAssigned.mock.calls[0];
            expect(name).toBe("s1");
            expect(["node-1", "node-2"]).toContain(chosenNode);
            expect(result).toBe(reassigned);
        });

        it("throws NotFound when the stream does not exist", async () => {
            repo.findByName.mockResolvedValue(null);

            await expect(service.ensureAssigned("missing", ["node-1"])).rejects.toBeInstanceOf(
                NotFoundException,
            );
            expect(streamStatus.markAssigned).not.toHaveBeenCalled();
        });
    });
});

import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { Stream } from "@/streams/domain";
import { StreamRepository } from "@/streams/repositories";
import { StreamStatus, SystemEventNames } from "@/common";
import { StreamAssignmentService } from "@/streams/services";

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
    let events: jest.Mocked<EventEmitter2>;

    beforeEach(async () => {
        repo = {
            assignToNode: jest.fn(),
            clearAssignment: jest.fn(),
            findByName: jest.fn(),
        } as unknown as jest.Mocked<StreamRepository>;
        events = { emit: jest.fn() } as unknown as jest.Mocked<EventEmitter2>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                StreamAssignmentService,
                { provide: StreamRepository, useValue: repo },
                { provide: EventEmitter2, useValue: events },
            ],
        }).compile();

        service = module.get<StreamAssignmentService>(StreamAssignmentService);
    });

    describe("assignToNode", () => {
        it("assigns and emits stream.assigned", async () => {
            const assignedAt = new Date();
            const stream = makeStream({ assignedNode: "node-1", assignedAt });
            repo.assignToNode.mockResolvedValue(stream);

            const result = await service.assignToNode("s1", "node-1");

            expect(result).toBe(stream);
            expect(repo.assignToNode).toHaveBeenCalledWith("s1", "node-1", expect.any(Date));
            expect(events.emit).toHaveBeenCalledWith(SystemEventNames.STREAM_ASSIGNED, {
                streamName: "s1",
                nodeId: "node-1",
                assignedAt,
            });
        });

        it("throws NotFound when the stream does not exist", async () => {
            repo.assignToNode.mockResolvedValue(null);

            await expect(service.assignToNode("missing", "node-1")).rejects.toBeInstanceOf(
                NotFoundException,
            );
            expect(events.emit).not.toHaveBeenCalled();
        });
    });

    describe("clearAssignment", () => {
        it("clears and emits stream.unassigned", async () => {
            const stream = makeStream();
            repo.clearAssignment.mockResolvedValue(stream);

            const result = await service.clearAssignment("s1");

            expect(result).toBe(stream);
            expect(events.emit).toHaveBeenCalledWith(SystemEventNames.STREAM_UNASSIGNED, "s1");
        });

        it("throws NotFound when the stream does not exist", async () => {
            repo.clearAssignment.mockResolvedValue(null);

            await expect(service.clearAssignment("missing")).rejects.toBeInstanceOf(
                NotFoundException,
            );
        });
    });

    describe("ensureAssigned", () => {
        it("keeps the current assignment when the node is still a candidate", async () => {
            const stream = makeStream({ assignedNode: "node-1" });
            repo.findByName.mockResolvedValue(stream);

            const result = await service.ensureAssigned("s1", ["node-1", "node-2"]);

            expect(result).toBe(stream);
            expect(repo.assignToNode).not.toHaveBeenCalled();
        });

        it("hashes the name to a candidate node and assigns when unassigned", async () => {
            const unassigned = makeStream({ assignedNode: null });
            const reassigned = makeStream({ assignedNode: "node-1", assignedAt: new Date() });
            repo.findByName.mockResolvedValue(unassigned);
            repo.assignToNode.mockResolvedValue(reassigned);

            const result = await service.ensureAssigned("s1", ["node-1", "node-2"]);

            const [name, chosenNode] = repo.assignToNode.mock.calls[0];
            expect(name).toBe("s1");
            expect(["node-1", "node-2"]).toContain(chosenNode);
            expect(result).toBe(reassigned);
        });

        it("throws NotFound when the stream does not exist", async () => {
            repo.findByName.mockResolvedValue(null);

            await expect(service.ensureAssigned("missing", ["node-1"])).rejects.toBeInstanceOf(
                NotFoundException,
            );
            expect(repo.assignToNode).not.toHaveBeenCalled();
        });
    });
});

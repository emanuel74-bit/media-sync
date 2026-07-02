import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { Stream } from "@/streams/domain";
import { StreamStatus, SystemEventNames } from "@/common";
import { StreamRepository } from "@/streams/repositories";
import { StreamAssignmentService } from "@/streams/services";
import { StreamAssignmentPolicy } from "@/streams/services/assignment/stream-assignment.policy";

const makeStream = (overrides: Partial<Stream> = {}): Stream => ({
    name: "s1",
    source: "rtsp://x",
    status: StreamStatus.ASSIGNED,
    metadata: {},
    isEnabled: true,
    isManual: false,
    activeConsumers: 0,
    assignedPod: null,
    assignedAt: null,
    ...overrides,
});

describe("StreamAssignmentService", () => {
    let service: StreamAssignmentService;
    let repo: jest.Mocked<StreamRepository>;
    let events: jest.Mocked<EventEmitter2>;
    let policy: jest.Mocked<StreamAssignmentPolicy>;

    beforeEach(async () => {
        repo = {
            assignToPod: jest.fn(),
            clearAssignment: jest.fn(),
            findByName: jest.fn(),
        } as unknown as jest.Mocked<StreamRepository>;
        events = { emit: jest.fn() } as unknown as jest.Mocked<EventEmitter2>;
        policy = { selectPod: jest.fn() } as unknown as jest.Mocked<StreamAssignmentPolicy>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                StreamAssignmentService,
                { provide: StreamRepository, useValue: repo },
                { provide: EventEmitter2, useValue: events },
                { provide: StreamAssignmentPolicy, useValue: policy },
            ],
        }).compile();

        service = module.get<StreamAssignmentService>(StreamAssignmentService);
    });

    describe("assignToPod", () => {
        it("assigns and emits stream.assigned", async () => {
            const assignedAt = new Date();
            const stream = makeStream({ assignedPod: "pod-1", assignedAt });
            repo.assignToPod.mockResolvedValue(stream);

            const result = await service.assignToPod("s1", "pod-1");

            expect(result).toBe(stream);
            expect(repo.assignToPod).toHaveBeenCalledWith("s1", "pod-1", expect.any(Date));
            expect(events.emit).toHaveBeenCalledWith(SystemEventNames.STREAM_ASSIGNED, {
                streamName: "s1",
                podId: "pod-1",
                assignedAt,
            });
        });

        it("throws NotFound when the stream does not exist", async () => {
            repo.assignToPod.mockResolvedValue(null);

            await expect(service.assignToPod("missing", "pod-1")).rejects.toBeInstanceOf(
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
        it("keeps the current assignment when the pod is still a candidate", async () => {
            const stream = makeStream({ assignedPod: "pod-1" });
            repo.findByName.mockResolvedValue(stream);

            const result = await service.ensureAssigned("s1", ["pod-1", "pod-2"]);

            expect(result).toBe(stream);
            expect(policy.selectPod).not.toHaveBeenCalled();
            expect(repo.assignToPod).not.toHaveBeenCalled();
        });

        it("selects a pod via the policy and assigns when unassigned", async () => {
            const unassigned = makeStream({ assignedPod: null });
            const reassigned = makeStream({ assignedPod: "pod-2", assignedAt: new Date() });
            repo.findByName.mockResolvedValue(unassigned);
            policy.selectPod.mockReturnValue("pod-2");
            repo.assignToPod.mockResolvedValue(reassigned);

            const result = await service.ensureAssigned("s1", ["pod-1", "pod-2"]);

            expect(policy.selectPod).toHaveBeenCalledWith("s1", ["pod-1", "pod-2"]);
            expect(repo.assignToPod).toHaveBeenCalledWith("s1", "pod-2", expect.any(Date));
            expect(result).toBe(reassigned);
        });

        it("throws NotFound when the stream does not exist", async () => {
            repo.findByName.mockResolvedValue(null);

            await expect(service.ensureAssigned("missing", ["pod-1"])).rejects.toBeInstanceOf(
                NotFoundException,
            );
            expect(policy.selectPod).not.toHaveBeenCalled();
        });
    });
});

import { EventEmitter2 } from "@nestjs/event-emitter";
import { NotFoundException } from "@nestjs/common";

import { Stream } from "@/streams";
import { SystemEventNames } from "@/system-events";

import { StreamRepository } from "../../../../src/streams/repositories/stream.repository";
import { StreamAssignmentPolicy } from "../../../../src/streams/services/assignment/stream-assignment.policy";
import { StreamAssignmentService } from "../../../../src/streams/services/assignment/stream-assignment.service";
import { StreamQueryService } from "../../../../src/streams/services/query/stream-query.service";

const makeStream = (overrides: Partial<Stream> = {}): Stream =>
    ({
        name: "stream-a",
        source: "rtsp://camera/stream-a",
        status: "ready",
        assignedPod: null,
        assignedAt: new Date("2026-01-01T00:00:00.000Z"),
        isEnabled: true,
        isManual: false,
        metadata: {},
        activeConsumers: 0,
        lastError: null,
        ...overrides,
    }) as Stream;

describe("StreamAssignmentService", () => {
    let service: StreamAssignmentService;
    let streamRepository: jest.Mocked<StreamRepository>;
    let streamQuery: jest.Mocked<StreamQueryService>;
    let events: jest.Mocked<EventEmitter2>;
    let assignmentPolicy: jest.Mocked<StreamAssignmentPolicy>;

    beforeEach(() => {
        streamRepository = {
            assignToPod: jest.fn(),
            clearAssignment: jest.fn(),
        } as unknown as jest.Mocked<StreamRepository>;
        streamQuery = {
            findRequiredByName: jest.fn(),
        } as unknown as jest.Mocked<StreamQueryService>;
        events = { emit: jest.fn() } as unknown as jest.Mocked<EventEmitter2>;
        assignmentPolicy = {
            selectPod: jest.fn(),
        } as unknown as jest.Mocked<StreamAssignmentPolicy>;

        service = new StreamAssignmentService(
            streamRepository,
            streamQuery,
            events,
            assignmentPolicy,
        );
    });

    describe("assignToPod", () => {
        it("assigns a stream and emits STREAM_ASSIGNED", async () => {
            const assigned = makeStream({ assignedPod: "pod-1" });
            streamRepository.assignToPod.mockResolvedValue(assigned);

            const result = await service.assignToPod("stream-a", "pod-1");

            expect(result).toBe(assigned);
            expect(events.emit).toHaveBeenCalledWith(SystemEventNames.STREAM_ASSIGNED, {
                streamName: "stream-a",
                podId: "pod-1",
                assignedAt: assigned.assignedAt,
            });
        });

        it("throws when the stream cannot be assigned because it does not exist", async () => {
            streamRepository.assignToPod.mockResolvedValue(null);

            await expect(service.assignToPod("missing", "pod-1")).rejects.toBeInstanceOf(
                NotFoundException,
            );
        });
    });

    describe("clearAssignment", () => {
        it("clears an assignment and emits STREAM_UNASSIGNED", async () => {
            const cleared = makeStream({ assignedPod: null });
            streamRepository.clearAssignment.mockResolvedValue(cleared);

            const result = await service.clearAssignment("stream-a");

            expect(result).toBe(cleared);
            expect(events.emit).toHaveBeenCalledWith(
                SystemEventNames.STREAM_UNASSIGNED,
                "stream-a",
            );
        });
    });

    describe("ensureAssigned", () => {
        it("returns the current stream when it is already assigned to a valid pod", async () => {
            const stream = makeStream({ assignedPod: "pod-1" });
            streamQuery.findRequiredByName.mockResolvedValue(stream);

            const result = await service.ensureAssigned("stream-a", ["pod-1", "pod-2"]);

            expect(result).toBe(stream);
            expect(assignmentPolicy.selectPod).not.toHaveBeenCalled();
            expect(streamRepository.assignToPod).not.toHaveBeenCalled();
        });

        it("selects a pod and delegates to assignToPod when a new assignment is needed", async () => {
            const existing = makeStream({ assignedPod: null });
            const assigned = makeStream({ assignedPod: "pod-2" });
            streamQuery.findRequiredByName.mockResolvedValue(existing);
            assignmentPolicy.selectPod.mockReturnValue("pod-2");
            streamRepository.assignToPod.mockResolvedValue(assigned);

            const result = await service.ensureAssigned("stream-a", ["pod-1", "pod-2"]);

            expect(assignmentPolicy.selectPod).toHaveBeenCalledWith("stream-a", ["pod-1", "pod-2"]);
            expect(result).toBe(assigned);
        });
    });

    describe("reassign", () => {
        it("returns the original stream when no alternative pod is available", async () => {
            const stream = makeStream({ assignedPod: "pod-1" });
            streamQuery.findRequiredByName.mockResolvedValue(stream);

            const result = await service.reassign("stream-a", ["pod-1"]);

            expect(result).toBe(stream);
            expect(assignmentPolicy.selectPod).not.toHaveBeenCalled();
        });

        it("filters out the current pod before selecting a replacement", async () => {
            const stream = makeStream({ assignedPod: "pod-1" });
            const reassigned = makeStream({ assignedPod: "pod-3" });
            streamQuery.findRequiredByName.mockResolvedValue(stream);
            assignmentPolicy.selectPod.mockReturnValue("pod-3");
            streamRepository.assignToPod.mockResolvedValue(reassigned);

            const result = await service.reassign("stream-a", ["pod-1", "pod-2", "pod-3"]);

            expect(assignmentPolicy.selectPod).toHaveBeenCalledWith("stream-a", ["pod-2", "pod-3"]);
            expect(result).toBe(reassigned);
        });
    });
});

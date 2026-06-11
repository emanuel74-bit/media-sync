import { Test, TestingModule } from "@nestjs/testing";

import { StreamStatus } from "@/common";
import { Stream, StreamAssignmentService, StreamQueryService } from "@/streams";
import { MetricFailoverStreamGatewayService } from "@/metrics/services";

const makeStream = (overrides: Partial<Stream> = {}): Stream => ({
    name: "stream-1",
    source: "rtsp://source",
    status: StreamStatus.SYNCED,
    metadata: {},
    isEnabled: true,
    isManual: false,
    activeConsumers: 0,
    assignedPod: "pod-a",
    assignedAt: new Date(),
    lastSeenAt: new Date(),
    lastSyncedAt: new Date(),
    lastError: null,
    ...overrides,
});

describe("MetricFailoverStreamGatewayService", () => {
    let service: MetricFailoverStreamGatewayService;
    let streamQuery: jest.Mocked<StreamQueryService>;
    let streamAssignment: jest.Mocked<StreamAssignmentService>;

    beforeEach(async () => {
        streamQuery = {
            findAssignedByName: jest.fn(),
        } as unknown as jest.Mocked<StreamQueryService>;

        streamAssignment = {
            reassign: jest.fn(),
        } as unknown as jest.Mocked<StreamAssignmentService>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MetricFailoverStreamGatewayService,
                { provide: StreamQueryService, useValue: streamQuery },
                { provide: StreamAssignmentService, useValue: streamAssignment },
            ],
        }).compile();

        service = module.get<MetricFailoverStreamGatewayService>(
            MetricFailoverStreamGatewayService,
        );
    });

    it("delegates assigned stream lookup to StreamQueryService", async () => {
        const stream = makeStream();
        streamQuery.findAssignedByName.mockResolvedValue(stream);

        const result = await service.findAssignedStream("stream-1");

        expect(result).toBe(stream);
        expect(streamQuery.findAssignedByName).toHaveBeenCalledWith("stream-1");
    });

    it("delegates stream reassignment to StreamAssignmentService", async () => {
        const reassigned = makeStream({ assignedPod: "pod-b" });
        streamAssignment.reassign.mockResolvedValue(reassigned);

        const result = await service.reassignStream("stream-1", ["pod-a", "pod-b"]);

        expect(result).toBe(reassigned);
        expect(streamAssignment.reassign).toHaveBeenCalledWith("stream-1", ["pod-a", "pod-b"]);
    });
});

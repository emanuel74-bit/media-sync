import { Test, TestingModule } from "@nestjs/testing";

import { Metric } from "@/metrics";
import { PodRole } from "@/common";
import { PodQueryService } from "@/pods";
import { RuntimeConfigService } from "@/runtime-config";
import { Stream } from "@/streams";
import { StreamsFacadeService } from "@/streams";

import { StreamFailoverService } from "../../../../src/metrics/services/failover/stream-failover.service";

const makeMetric = (overrides: Partial<Metric> = {}): Metric =>
    ({
        streamName: "stream-a",
        context: PodRole.CLUSTER,
        bitrate: 2000,
        fps: 30,
        latency: 50,
        jitter: 1,
        packetLoss: 0,
        consumers: 1,
        ...overrides,
    }) as Metric;

const makeStream = (overrides: Partial<Stream> = {}): Stream =>
    ({
        name: "stream-a",
        source: "rtsp://camera/stream-a",
        status: "ready",
        assignedPod: "pod-1",
        isEnabled: true,
        isManual: false,
        metadata: {},
        activeConsumers: 0,
        lastError: null,
        ...overrides,
    }) as Stream;

describe("StreamFailoverService", () => {
    let service: StreamFailoverService;
    let config: RuntimeConfigService;
    let streams: jest.Mocked<StreamsFacadeService>;
    let podsService: jest.Mocked<PodQueryService>;

    beforeEach(async () => {
        config = {
            alertPacketLossThreshold: 10,
            alertLatencyHighThreshold: 100,
        } as RuntimeConfigService;
        streams = {
            findAssignedByName: jest.fn(),
            reassign: jest.fn(),
        } as unknown as jest.Mocked<StreamsFacadeService>;
        podsService = {
            listActivePodIds: jest.fn(),
        } as unknown as jest.Mocked<PodQueryService>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                StreamFailoverService,
                { provide: RuntimeConfigService, useValue: config },
                { provide: StreamsFacadeService, useValue: streams },
                { provide: PodQueryService, useValue: podsService },
            ],
        }).compile();

        service = module.get<StreamFailoverService>(StreamFailoverService);
    });

    it("returns early when the metric is not degraded", async () => {
        await service.evaluateAndReassignIfDegraded("stream-a", makeMetric());

        expect(streams.findAssignedByName).not.toHaveBeenCalled();
        expect(streams.reassign).not.toHaveBeenCalled();
    });

    it("returns early when no assigned stream exists", async () => {
        streams.findAssignedByName.mockResolvedValue(null);

        await service.evaluateAndReassignIfDegraded(
            "stream-a",
            makeMetric({ packetLoss: 99, latency: 999 }),
        );

        expect(podsService.listActivePodIds).not.toHaveBeenCalled();
        expect(streams.reassign).not.toHaveBeenCalled();
    });

    it("returns early when there are not enough candidate pods", async () => {
        streams.findAssignedByName.mockResolvedValue(makeStream());
        podsService.listActivePodIds.mockResolvedValue(["pod-1"]);

        await service.evaluateAndReassignIfDegraded(
            "stream-a",
            makeMetric({ packetLoss: 99, latency: 999 }),
        );

        expect(streams.reassign).not.toHaveBeenCalled();
    });

    it("reassigns the stream when the metric is degraded and candidates exist", async () => {
        streams.findAssignedByName.mockResolvedValue(makeStream({ assignedPod: "pod-1" }));
        podsService.listActivePodIds.mockResolvedValue(["pod-1", "pod-2"]);
        streams.reassign.mockResolvedValue(makeStream({ assignedPod: "pod-2" }));

        await service.evaluateAndReassignIfDegraded(
            "stream-a",
            makeMetric({ packetLoss: 99, latency: 999 }),
        );

        expect(podsService.listActivePodIds).toHaveBeenCalledWith(PodRole.CLUSTER);
        expect(streams.reassign).toHaveBeenCalledWith("stream-a", ["pod-1", "pod-2"]);
    });
});

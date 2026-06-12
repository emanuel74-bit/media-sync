import { Test, TestingModule } from "@nestjs/testing";

import { Stream } from "@/streams";
import { ConfigService } from "@/config";
import { PodQueryService } from "@/pods";
import { Metric } from "@/metrics/domain";
import { PodRole, StreamStatus } from "@/common";
import { MetricFailoverStreamGatewayService, StreamFailoverService } from "@/metrics/services";

const makeMetric = (overrides: Partial<Metric> = {}): Metric => ({
    streamName: "stream-1",
    context: PodRole.CLUSTER,
    bitrate: 3000,
    fps: 30,
    latency: 10,
    jitter: 1,
    packetLoss: 0,
    consumers: 2,
    ...overrides,
});

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

describe("StreamFailoverService", () => {
    let service: StreamFailoverService;
    let failoverStreams: jest.Mocked<MetricFailoverStreamGatewayService>;
    let podsService: jest.Mocked<PodQueryService>;

    beforeEach(async () => {
        failoverStreams = {
            findAssignedStream: jest.fn(),
            reassignStream: jest.fn(),
        } as unknown as jest.Mocked<MetricFailoverStreamGatewayService>;

        podsService = {
            listActivePodIds: jest.fn(),
        } as unknown as jest.Mocked<PodQueryService>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                StreamFailoverService,
                {
                    provide: ConfigService,
                    useValue: {
                        alertPacketLossThreshold: 5,
                        alertLatencyHighThreshold: 100,
                    },
                },
                { provide: MetricFailoverStreamGatewayService, useValue: failoverStreams },
                { provide: PodQueryService, useValue: podsService },
            ],
        }).compile();

        service = module.get<StreamFailoverService>(StreamFailoverService);
    });

    it("ignores metrics from non-cluster contexts even when degraded", async () => {
        await service.evaluateAndReassignIfDegraded(
            "stream-1",
            PodRole.INGEST,
            makeMetric({ packetLoss: 10, context: PodRole.INGEST }),
        );

        expect(failoverStreams.findAssignedStream).not.toHaveBeenCalled();
        expect(podsService.listActivePodIds).not.toHaveBeenCalled();
        expect(failoverStreams.reassignStream).not.toHaveBeenCalled();
    });

    it("does nothing when the metric is not degraded", async () => {
        await service.evaluateAndReassignIfDegraded("stream-1", PodRole.CLUSTER, makeMetric());

        expect(failoverStreams.findAssignedStream).not.toHaveBeenCalled();
        expect(podsService.listActivePodIds).not.toHaveBeenCalled();
        expect(failoverStreams.reassignStream).not.toHaveBeenCalled();
    });

    it("stops when no assigned stream is found", async () => {
        failoverStreams.findAssignedStream.mockResolvedValue(null);

        await service.evaluateAndReassignIfDegraded(
            "stream-1",
            PodRole.CLUSTER,
            makeMetric({ packetLoss: 10 }),
        );

        expect(failoverStreams.findAssignedStream).toHaveBeenCalledWith("stream-1");
        expect(podsService.listActivePodIds).not.toHaveBeenCalled();
        expect(failoverStreams.reassignStream).not.toHaveBeenCalled();
    });

    it("stops when there are not enough candidate pods to fail over", async () => {
        failoverStreams.findAssignedStream.mockResolvedValue(makeStream());
        podsService.listActivePodIds.mockResolvedValue(["pod-a"]);

        await service.evaluateAndReassignIfDegraded(
            "stream-1",
            PodRole.CLUSTER,
            makeMetric({ latency: 150 }),
        );

        expect(podsService.listActivePodIds).toHaveBeenCalledWith(PodRole.CLUSTER);
        expect(failoverStreams.reassignStream).not.toHaveBeenCalled();
    });

    it("reassigns degraded streams across active cluster pods", async () => {
        const stream = makeStream({ assignedPod: "pod-a" });
        const reassigned = makeStream({ assignedPod: "pod-b" });
        const warnSpy = jest.spyOn((service as any).logger, "warn");
        failoverStreams.findAssignedStream.mockResolvedValue(stream);
        podsService.listActivePodIds.mockResolvedValue(["pod-a", "pod-b", "pod-c"]);
        failoverStreams.reassignStream.mockResolvedValue(reassigned);

        await service.evaluateAndReassignIfDegraded(
            "stream-1",
            PodRole.CLUSTER,
            makeMetric({ packetLoss: 10 }),
        );

        expect(failoverStreams.reassignStream).toHaveBeenCalledWith("stream-1", [
            "pod-a",
            "pod-b",
            "pod-c",
        ]);
        expect(warnSpy).toHaveBeenCalledWith("Reassigned stream-1 from pod-a to pod-b");
    });

    it("does not warn when reassignment keeps the same pod", async () => {
        const stream = makeStream({ assignedPod: "pod-a" });
        const warnSpy = jest.spyOn((service as any).logger, "warn");
        failoverStreams.findAssignedStream.mockResolvedValue(stream);
        podsService.listActivePodIds.mockResolvedValue(["pod-a", "pod-b"]);
        failoverStreams.reassignStream.mockResolvedValue(makeStream({ assignedPod: "pod-a" }));

        await service.evaluateAndReassignIfDegraded(
            "stream-1",
            PodRole.CLUSTER,
            makeMetric({ latency: 150 }),
        );

        expect(failoverStreams.reassignStream).toHaveBeenCalledTimes(1);
        expect(warnSpy).not.toHaveBeenCalled();
    });
});

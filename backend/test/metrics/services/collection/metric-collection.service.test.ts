import { Test, TestingModule } from "@nestjs/testing";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { NodeRole, SystemEventNames } from "@/common";
import { MediaMtxMetricsService } from "@/media-nodes";
import { MediaMtxMetricsSnapshot } from "@/infrastructure";
import { MetricCollectionService, MetricPersistenceService } from "@/metrics/services";

const snapshot = (
    node: string,
    context: NodeRole,
    streamName: string,
): MediaMtxMetricsSnapshot => ({
    node: {
        context,
        node,
        paths: 1,
        rtspConns: 1,
        rtspSessions: 1,
        rtmpConns: 0,
        srtConns: 0,
        webrtcSessions: 0,
        hlsMuxers: 0,
    },
    paths: [
        {
            streamName,
            context,
            node,
            state: "ready",
            ready: true,
            bytesReceived: 1024,
            bytesSent: 0,
            readers: 0,
            framesInError: 0,
        },
    ],
});

describe("MetricCollectionService", () => {
    let service: MetricCollectionService;
    let mediaMtxMetrics: jest.Mocked<MediaMtxMetricsService>;
    let persistence: jest.Mocked<MetricPersistenceService>;
    let events: jest.Mocked<EventEmitter2>;

    beforeEach(async () => {
        mediaMtxMetrics = {
            collect: jest.fn(),
        } as unknown as jest.Mocked<MediaMtxMetricsService>;
        persistence = {
            saveNodeMetrics: jest.fn().mockResolvedValue(undefined),
            savePathMetrics: jest.fn().mockResolvedValue(undefined),
        } as unknown as jest.Mocked<MetricPersistenceService>;
        events = { emit: jest.fn() } as unknown as jest.Mocked<EventEmitter2>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MetricCollectionService,
                { provide: MediaMtxMetricsService, useValue: mediaMtxMetrics },
                { provide: MetricPersistenceService, useValue: persistence },
                { provide: EventEmitter2, useValue: events },
            ],
        }).compile();

        service = module.get<MetricCollectionService>(MetricCollectionService);
    });

    it("persists node + path metrics from every node and emits metrics.collected", async () => {
        mediaMtxMetrics.collect.mockResolvedValue([
            snapshot("ingest-1", NodeRole.INGEST, "live"),
            snapshot("cluster-1", NodeRole.CLUSTER, "live"),
        ]);

        await service.collectMetrics();

        expect(persistence.saveNodeMetrics).toHaveBeenCalledWith([
            expect.objectContaining({ node: "ingest-1" }),
            expect.objectContaining({ node: "cluster-1" }),
        ]);
        expect(persistence.savePathMetrics).toHaveBeenCalledWith([
            expect.objectContaining({ node: "ingest-1", streamName: "live" }),
            expect.objectContaining({ node: "cluster-1", streamName: "live" }),
        ]);
        expect(events.emit).toHaveBeenCalledWith(
            SystemEventNames.METRICS_COLLECTED,
            expect.objectContaining({
                nodes: expect.arrayContaining([expect.objectContaining({ node: "ingest-1" })]),
                paths: expect.arrayContaining([expect.objectContaining({ streamName: "live" })]),
                collectedAt: expect.any(Date),
            }),
        );
    });

    it("propagates a failing scrape cycle (the scheduler guards it) without persisting or emitting", async () => {
        mediaMtxMetrics.collect.mockRejectedValue(new Error("scrape boom"));

        await expect(service.collectMetrics()).rejects.toThrow("scrape boom");

        expect(persistence.saveNodeMetrics).not.toHaveBeenCalled();
        expect(events.emit).not.toHaveBeenCalled();
    });
});

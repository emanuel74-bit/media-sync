import { Test, TestingModule } from "@nestjs/testing";

import { NodeRole } from "@/common";
import { PathMetric, NodeMetric } from "@/metrics/domain";
import { MetricsController } from "@/metrics/controllers";
import { MetricPersistenceService } from "@/metrics/services";

const makePathMetric = (overrides: Partial<PathMetric> = {}): PathMetric => ({
    streamName: "stream-1",
    context: NodeRole.CLUSTER,
    node: "cluster-1",
    state: "ready",
    ready: true,
    bytesReceived: 1024,
    bytesSent: 0,
    readers: 1,
    framesInError: 0,
    createdAt: new Date(),
    ...overrides,
});

const makeNodeMetric = (overrides: Partial<NodeMetric> = {}): NodeMetric => ({
    context: NodeRole.INGEST,
    node: "ingest-1",
    paths: 2,
    rtspConns: 1,
    rtspSessions: 1,
    rtmpConns: 0,
    srtConns: 0,
    webrtcSessions: 0,
    hlsMuxers: 0,
    createdAt: new Date(),
    ...overrides,
});

describe("MetricsController", () => {
    let controller: MetricsController;
    let metricPersistence: jest.Mocked<MetricPersistenceService>;

    beforeEach(async () => {
        metricPersistence = {
            findRecentPathMetrics: jest.fn(),
            findRecentNodeMetrics: jest.fn(),
        } as unknown as jest.Mocked<MetricPersistenceService>;

        const module: TestingModule = await Test.createTestingModule({
            controllers: [MetricsController],
            providers: [{ provide: MetricPersistenceService, useValue: metricPersistence }],
        }).compile();

        controller = module.get<MetricsController>(MetricsController);
    });

    it("delegates per-stream path metrics with the resolved limit", async () => {
        const metrics = [makePathMetric()];
        metricPersistence.findRecentPathMetrics.mockResolvedValue(metrics);

        const result = await controller.streamMetrics("stream-1", 25);

        expect(result).toBe(metrics);
        expect(metricPersistence.findRecentPathMetrics).toHaveBeenCalledWith("stream-1", 25);
    });

    it("delegates node metrics with the resolved limit", async () => {
        const metrics = [makeNodeMetric()];
        metricPersistence.findRecentNodeMetrics.mockResolvedValue(metrics);

        const result = await controller.nodeMetrics(10);

        expect(result).toBe(metrics);
        expect(metricPersistence.findRecentNodeMetrics).toHaveBeenCalledWith(10);
    });
});

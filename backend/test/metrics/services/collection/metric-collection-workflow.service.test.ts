import { Test, TestingModule } from "@nestjs/testing";

import { PodRole } from "@/common";
import { Metric } from "@/metrics/domain";
import { MetricCollectionWorkflowService } from "@/metrics/services/collection/metric-collection-workflow.service";
import {
    MetricAlertReactionService,
    MetricFailoverReactionService,
} from "@/metrics/services/reactions";
import { StreamMetricCollectorService } from "@/metrics/services/collection/stream-metric-collector.service";

const makeMetric = (): Metric => ({
    streamName: "live",
    context: PodRole.CLUSTER,
    bitrate: 2000,
    fps: 30,
    latency: 50,
    jitter: 1,
    packetLoss: 0,
    consumers: 3,
});

describe("MetricCollectionWorkflowService", () => {
    let service: MetricCollectionWorkflowService;
    let metricCollector: jest.Mocked<StreamMetricCollectorService>;
    let alertReaction: jest.Mocked<MetricAlertReactionService>;
    let failoverReaction: jest.Mocked<MetricFailoverReactionService>;

    beforeEach(async () => {
        metricCollector = {
            collectStreamMetric: jest.fn(),
        } as unknown as jest.Mocked<StreamMetricCollectorService>;

        alertReaction = {
            handleCollectedMetric: jest.fn(),
        } as unknown as jest.Mocked<MetricAlertReactionService>;

        failoverReaction = {
            handleCollectedMetric: jest.fn(),
        } as unknown as jest.Mocked<MetricFailoverReactionService>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MetricCollectionWorkflowService,
                { provide: StreamMetricCollectorService, useValue: metricCollector },
                { provide: MetricAlertReactionService, useValue: alertReaction },
                { provide: MetricFailoverReactionService, useValue: failoverReaction },
            ],
        }).compile();

        service = module.get<MetricCollectionWorkflowService>(MetricCollectionWorkflowService);
    });

    describe("runStreamMetricWorkflow — success path", () => {
        it("collects the metric and delegates to both reactions", async () => {
            const metric = makeMetric();
            metricCollector.collectStreamMetric.mockResolvedValue(metric);
            alertReaction.handleCollectedMetric.mockResolvedValue(undefined);
            failoverReaction.handleCollectedMetric.mockResolvedValue(undefined);

            await service.runStreamMetricWorkflow("live", PodRole.CLUSTER);

            expect(metricCollector.collectStreamMetric).toHaveBeenCalledWith(
                "live",
                PodRole.CLUSTER,
            );
            expect(alertReaction.handleCollectedMetric).toHaveBeenCalledWith("live", metric);
            expect(failoverReaction.handleCollectedMetric).toHaveBeenCalledWith(
                "live",
                PodRole.CLUSTER,
                metric,
            );
        });
    });

    describe("runStreamMetricWorkflow — error path", () => {
        it("catches collection errors and does not rethrow", async () => {
            metricCollector.collectStreamMetric.mockRejectedValue(new Error("network error"));

            await expect(
                service.runStreamMetricWorkflow("live", PodRole.CLUSTER),
            ).resolves.toBeUndefined();

            expect(alertReaction.handleCollectedMetric).not.toHaveBeenCalled();
            expect(failoverReaction.handleCollectedMetric).not.toHaveBeenCalled();
        });

        it("catches reaction errors and does not rethrow", async () => {
            metricCollector.collectStreamMetric.mockResolvedValue(makeMetric());
            alertReaction.handleCollectedMetric.mockRejectedValue(new Error("timeout"));

            await expect(
                service.runStreamMetricWorkflow("live", PodRole.INGEST),
            ).resolves.toBeUndefined();

            expect(failoverReaction.handleCollectedMetric).not.toHaveBeenCalled();
        });
    });
});

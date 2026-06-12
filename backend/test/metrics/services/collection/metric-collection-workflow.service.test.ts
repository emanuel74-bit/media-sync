import { Test, TestingModule } from "@nestjs/testing";

import { PodRole } from "@/common";
import { Metric } from "@/metrics/domain";
import {
    StreamFailoverService,
    MetricAlertInvocationService,
    StreamMetricCollectorService,
    MetricCollectionWorkflowService,
} from "@/metrics/services";

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
    let metricAlerts: jest.Mocked<MetricAlertInvocationService>;
    let streamFailover: jest.Mocked<StreamFailoverService>;

    beforeEach(async () => {
        metricCollector = {
            collectStreamMetric: jest.fn(),
        } as unknown as jest.Mocked<StreamMetricCollectorService>;

        metricAlerts = {
            checkMetricsAndAlert: jest.fn(),
        } as unknown as jest.Mocked<MetricAlertInvocationService>;

        streamFailover = {
            evaluateAndReassignIfDegraded: jest.fn(),
        } as unknown as jest.Mocked<StreamFailoverService>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MetricCollectionWorkflowService,
                { provide: StreamMetricCollectorService, useValue: metricCollector },
                { provide: MetricAlertInvocationService, useValue: metricAlerts },
                { provide: StreamFailoverService, useValue: streamFailover },
            ],
        }).compile();

        service = module.get<MetricCollectionWorkflowService>(MetricCollectionWorkflowService);
    });

    describe("runStreamMetricWorkflow — success path", () => {
        it("collects the metric, checks alerts, and evaluates failover", async () => {
            const metric = makeMetric();
            metricCollector.collectStreamMetric.mockResolvedValue(metric);
            metricAlerts.checkMetricsAndAlert.mockResolvedValue(undefined);
            streamFailover.evaluateAndReassignIfDegraded.mockResolvedValue(undefined);

            await service.runStreamMetricWorkflow("live", PodRole.CLUSTER);

            expect(metricCollector.collectStreamMetric).toHaveBeenCalledWith(
                "live",
                PodRole.CLUSTER,
            );
            expect(metricAlerts.checkMetricsAndAlert).toHaveBeenCalledWith("live", metric);
            expect(streamFailover.evaluateAndReassignIfDegraded).toHaveBeenCalledWith(
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

            expect(metricAlerts.checkMetricsAndAlert).not.toHaveBeenCalled();
            expect(streamFailover.evaluateAndReassignIfDegraded).not.toHaveBeenCalled();
        });

        it("catches alert errors and does not rethrow", async () => {
            metricCollector.collectStreamMetric.mockResolvedValue(makeMetric());
            metricAlerts.checkMetricsAndAlert.mockRejectedValue(new Error("timeout"));

            await expect(
                service.runStreamMetricWorkflow("live", PodRole.INGEST),
            ).resolves.toBeUndefined();

            expect(streamFailover.evaluateAndReassignIfDegraded).not.toHaveBeenCalled();
        });
    });
});

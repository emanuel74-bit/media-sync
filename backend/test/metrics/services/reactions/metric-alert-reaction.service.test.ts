import { Test, TestingModule } from "@nestjs/testing";

import { PodRole } from "@/common";
import { Metric } from "@/metrics/domain";
import { MetricAlertInvocationService } from "@/metrics/services";
import { MetricAlertReactionService } from "@/metrics/services/reactions/metric-alert-reaction.service";

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

describe("MetricAlertReactionService", () => {
    let service: MetricAlertReactionService;
    let metricAlerts: jest.Mocked<MetricAlertInvocationService>;

    beforeEach(async () => {
        metricAlerts = {
            checkMetricsAndAlert: jest.fn(),
        } as unknown as jest.Mocked<MetricAlertInvocationService>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MetricAlertReactionService,
                { provide: MetricAlertInvocationService, useValue: metricAlerts },
            ],
        }).compile();

        service = module.get<MetricAlertReactionService>(MetricAlertReactionService);
    });

    it("delegates collected metrics to MetricAlertInvocationService", async () => {
        const metric = makeMetric();
        metricAlerts.checkMetricsAndAlert.mockResolvedValue(undefined);

        await service.handleCollectedMetric("live", metric);

        expect(metricAlerts.checkMetricsAndAlert).toHaveBeenCalledWith("live", metric);
    });
});

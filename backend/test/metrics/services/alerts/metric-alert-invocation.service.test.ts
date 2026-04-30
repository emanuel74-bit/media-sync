import { Test, TestingModule } from "@nestjs/testing";

import { AlertRuleExecutionService } from "@/alerts";
import { Metric } from "@/metrics";
import { PodRole } from "@/common";
import { AlertMetricInput } from "@/common";
import { METRIC_ALERT_RULES } from "@/metrics";
import { RuntimeConfigService } from "@/runtime-config";
import { MetricCollectedPayload } from "@/system-events";

import { MetricAlertInvocationService } from "../../../../src/metrics/services/alerts/metric-alert-invocation.service";

const makeMetric = (overrides: Partial<Metric> = {}): Metric =>
    ({
        streamName: "stream-a",
        context: PodRole.CLUSTER,
        bitrate: 2000,
        fps: 30,
        latency: 50,
        jitter: 1,
        packetLoss: 0,
        consumers: 2,
        ...overrides,
    }) as Metric;

const makePayload = (overrides: Partial<MetricCollectedPayload> = {}): MetricCollectedPayload => ({
    streamName: "stream-a",
    metric: makeMetric(),
    ...overrides,
});

describe("MetricAlertInvocationService", () => {
    let service: MetricAlertInvocationService;
    let alertRuleExecution: jest.Mocked<AlertRuleExecutionService>;
    let config: RuntimeConfigService;

    beforeEach(async () => {
        alertRuleExecution = {
            evaluateAndEmit: jest.fn(),
        } as unknown as jest.Mocked<AlertRuleExecutionService>;
        config = {
            alertBitrateLowThreshold: 1000,
            alertPacketLossThreshold: 10,
            alertLatencyHighThreshold: 100,
        } as RuntimeConfigService;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MetricAlertInvocationService,
                { provide: AlertRuleExecutionService, useValue: alertRuleExecution },
                { provide: RuntimeConfigService, useValue: config },
            ],
        }).compile();

        service = module.get<MetricAlertInvocationService>(MetricAlertInvocationService);
    });

    it("maps config thresholds and invokes the rule evaluator", async () => {
        const metric = makeMetric() as AlertMetricInput;
        alertRuleExecution.evaluateAndEmit.mockResolvedValue([]);

        await service.checkMetricsAndAlert("stream-a", metric);

        expect(alertRuleExecution.evaluateAndEmit).toHaveBeenCalledWith(
            "stream-a",
            metric,
            {
                alertBitrateLowThreshold: 1000,
                alertPacketLossThreshold: 10,
                alertLatencyHighThreshold: 100,
            },
            METRIC_ALERT_RULES,
        );
    });

    it("delegates metric collected events to the evaluation method", async () => {
        const payload = makePayload();
        const spy = jest.spyOn(service, "checkMetricsAndAlert").mockResolvedValue(undefined);

        await service.handleMetricCollected(payload);

        expect(spy).toHaveBeenCalledWith(payload.streamName, payload.metric);
    });

    it("swallows errors raised by the rule evaluator", async () => {
        alertRuleExecution.evaluateAndEmit.mockRejectedValue(new Error("boom"));

        await expect(
            service.checkMetricsAndAlert("stream-a", makeMetric() as AlertMetricInput),
        ).resolves.toBeUndefined();
    });
});

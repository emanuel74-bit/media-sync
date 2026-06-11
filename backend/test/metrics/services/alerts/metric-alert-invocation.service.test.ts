import { AlertEvaluationService } from "@/alerts";
import { AlertMetricInput } from "@/common";
import { ConfigService } from "@/config";
import { METRIC_ALERT_RULES } from "@/metrics/domain";
import { MetricAlertInvocationService } from "@/metrics/services";

describe("MetricAlertInvocationService", () => {
    let service: MetricAlertInvocationService;
    let alerts: jest.Mocked<AlertEvaluationService>;

    const metric: AlertMetricInput = {
        bitrate: 450,
        packetLoss: 3,
        latency: 1200,
    };

    beforeEach(() => {
        alerts = {
            evaluateAndCreate: jest.fn(),
        } as unknown as jest.Mocked<AlertEvaluationService>;

        service = new MetricAlertInvocationService(alerts, {
            alertBitrateLowThreshold: 500,
            alertPacketLossThreshold: 2,
            alertLatencyHighThreshold: 1000,
        } as ConfigService);
    });

    it("builds thresholds from ConfigService and delegates to AlertEvaluationService", async () => {
        alerts.evaluateAndCreate.mockResolvedValue(undefined);

        await service.checkMetricsAndAlert("stream-1", metric);

        expect(alerts.evaluateAndCreate).toHaveBeenCalledWith(
            "stream-1",
            metric,
            {
                alertBitrateLowThreshold: 500,
                alertPacketLossThreshold: 2,
                alertLatencyHighThreshold: 1000,
            },
            METRIC_ALERT_RULES,
        );
    });

    it("logs and swallows rule evaluation errors", async () => {
        const error = new Error("evaluation failed");
        const errorSpy = jest.spyOn((service as any).logger, "error").mockImplementation();
        alerts.evaluateAndCreate.mockRejectedValue(error);

        await expect(service.checkMetricsAndAlert("stream-1", metric)).resolves.toBeUndefined();

        expect(errorSpy).toHaveBeenCalledWith("Failed during metric alert evaluation", error);
    });
});

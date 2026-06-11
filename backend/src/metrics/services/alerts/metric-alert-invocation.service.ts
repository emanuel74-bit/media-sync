import { Injectable, Logger } from "@nestjs/common";

import { AlertEvaluationService } from "@/alerts";
import { ConfigService } from "@/config";
import { AlertMetricInput } from "@/common";

import { METRIC_ALERT_RULES, MetricAlertThresholds } from "../../domain";

@Injectable()
export class MetricAlertInvocationService {
    private readonly logger = new Logger(MetricAlertInvocationService.name);

    constructor(
        private readonly alerts: AlertEvaluationService,
        private readonly config: ConfigService,
    ) {}

    async checkMetricsAndAlert(streamName: string, metric: AlertMetricInput): Promise<void> {
        try {
            const thresholds: MetricAlertThresholds = {
                alertBitrateLowThreshold: this.config.alertBitrateLowThreshold,
                alertPacketLossThreshold: this.config.alertPacketLossThreshold,
                alertLatencyHighThreshold: this.config.alertLatencyHighThreshold,
            };

            await this.alerts.evaluateAndCreate(
                streamName,
                metric,
                thresholds,
                METRIC_ALERT_RULES,
            );
        } catch (error) {
            this.logger.error("Failed during metric alert evaluation", error);
        }
    }
}

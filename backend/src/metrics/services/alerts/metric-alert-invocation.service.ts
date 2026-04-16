import { OnEvent } from "@nestjs/event-emitter";
import { Injectable, Logger } from "@nestjs/common";

import { ConfigService } from "../../../config";
import { METRIC_ALERT_RULES } from "./metric-alert-rules";
import { MetricAlertThresholds } from "./metric-alert-rule";
import { AlertMetricInput } from "../../../common/domain";
import { MetricCollectedPayload, SystemEventNames } from "../../../common/events";
import { AlertRuleEvaluator } from "../../../common/services";

@Injectable()
export class MetricAlertInvocationService {
    private readonly logger = new Logger(MetricAlertInvocationService.name);

    constructor(
        private readonly ruleEvaluator: AlertRuleEvaluator,
        private readonly config: ConfigService,
    ) {}

    async checkMetricsAndAlert(streamName: string, metric: AlertMetricInput): Promise<void> {
        try {
            const thresholds: MetricAlertThresholds = {
                alertBitrateLowThreshold: this.config.alertBitrateLowThreshold,
                alertPacketLossThreshold: this.config.alertPacketLossThreshold,
                alertLatencyHighThreshold: this.config.alertLatencyHighThreshold,
            };

            await this.ruleEvaluator.evaluateAndEmit(
                streamName,
                metric,
                thresholds,
                METRIC_ALERT_RULES,
            );
        } catch (error) {
            this.logger.error("Failed during metric alert evaluation", error);
        }
    }

    @OnEvent(SystemEventNames.METRIC_COLLECTED)
    async handleMetricCollected(payload: MetricCollectedPayload): Promise<void> {
        await this.checkMetricsAndAlert(payload.streamName, payload.metric);
    }
}

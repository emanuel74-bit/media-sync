import { OnEvent } from "@nestjs/event-emitter";
import { Injectable, Logger } from "@nestjs/common";

import { ConfigService } from "../../../config";
import { AlertMetricInput } from "../../../common/domain";
import { AlertRuleEvaluator } from "../../../common/services";
import { METRIC_ALERT_RULES } from "../../domain/consts/metric-alert-rules.const";
import { MetricAlertThresholds } from "../../domain/types/metric-alert-rule.types";
import { MetricCollectedPayload, SystemEventNames } from "../../../common/events";

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

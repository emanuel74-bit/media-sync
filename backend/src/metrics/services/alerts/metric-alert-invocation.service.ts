import { OnEvent } from "@nestjs/event-emitter";
import { Injectable, Logger } from "@nestjs/common";

import { AlertRuleExecutionService } from "@/alerts";
import { AlertMetricInput } from "@/common";
import { RuntimeConfigService } from "@/runtime-config";
import { MetricCollectedPayload, SystemEventNames } from "@/system-events";

import { METRIC_ALERT_RULES } from "../../domain/consts/metric-alert-rules.const";
import { MetricAlertThresholds } from "../../domain/types/metric-alert-rule.types";

@Injectable()
export class MetricAlertInvocationService {
    private readonly logger = new Logger(MetricAlertInvocationService.name);

    constructor(
        private readonly alertRuleExecution: AlertRuleExecutionService,
        private readonly config: RuntimeConfigService,
    ) {}

    async checkMetricsAndAlert(streamName: string, metric: AlertMetricInput): Promise<void> {
        try {
            const thresholds: MetricAlertThresholds = {
                alertBitrateLowThreshold: this.config.alertBitrateLowThreshold,
                alertPacketLossThreshold: this.config.alertPacketLossThreshold,
                alertLatencyHighThreshold: this.config.alertLatencyHighThreshold,
            };

            await this.alertRuleExecution.evaluateAndEmit(
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

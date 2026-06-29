import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";

import { AlertSignal, AlertSource, SystemEventNames, MetricsCollectedPayload } from "@/common";

import { RuleEvaluator } from "../evaluation";
import { METRIC_ALERT_RULES } from "../../domain";
import { AlertReconcileService } from "../reconciliation";

/**
 * Reacts to `metrics.collected`, evaluates operational rules against every path
 * sample, and reconciles the resulting signals (per stream) into alerts.
 */
@Injectable()
export class MetricAlertRuler {
    constructor(
        private readonly ruleEvaluator: RuleEvaluator,
        private readonly reconcile: AlertReconcileService,
    ) {}

    @OnEvent(SystemEventNames.METRICS_COLLECTED)
    async onMetricsCollected(payload: MetricsCollectedPayload): Promise<void> {
        const signalsBySubject = new Map<string, AlertSignal[]>();

        for (const path of payload.paths) {
            const signals = this.ruleEvaluator.evaluate(
                path.streamName,
                path,
                undefined,
                METRIC_ALERT_RULES,
            );
            const existing = signalsBySubject.get(path.streamName) ?? [];
            signalsBySubject.set(path.streamName, [...existing, ...signals]);
        }

        await this.reconcile.reconcileSource(AlertSource.METRICS, signalsBySubject);
    }
}

import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";

import { ConfigService } from "@/config";
import { AlertSource, RuleEvaluator, SystemEventNames, NodeSampledPayload } from "@/common";

import { AlertReconcileService } from "../alert-reconcile.service";
import { NODE_RESOURCE_RULES, NodeResourceAlertContext } from "../../domain";

/**
 * Reacts to `node.sampled` (a pod's self-reported CPU/memory/disk), evaluates the
 * resource thresholds, and reconciles the signals into alerts for that one node.
 */
@Injectable()
export class NodeResourceRuler {
    constructor(
        private readonly config: ConfigService,
        private readonly ruleEvaluator: RuleEvaluator,
        private readonly reconcile: AlertReconcileService,
    ) {}

    @OnEvent(SystemEventNames.NODE_SAMPLED)
    async onNodeSampled(payload: NodeSampledPayload): Promise<void> {
        const thresholds: NodeResourceAlertContext = {
            cpu: this.config.nodeCpuHighThreshold,
            memory: this.config.nodeMemoryHighThreshold,
            disk: this.config.nodeDiskHighThreshold,
        };

        const signals = this.ruleEvaluator.evaluate(
            payload.podId,
            payload,
            thresholds,
            NODE_RESOURCE_RULES,
        );

        await this.reconcile.reconcileSubject(AlertSource.NODE, payload.podId, signals);
    }
}

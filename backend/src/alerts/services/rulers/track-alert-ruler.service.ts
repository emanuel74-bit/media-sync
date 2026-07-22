import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";

import { StreamQueryService } from "@/streams";
import { AlertSource, SystemEventNames, StreamInspectedPayload } from "@/common";

import { RuleEvaluator } from "../evaluation";
import { AlertReconcileService } from "../reconciliation";
import { STREAM_TRACK_ALERT_RULES, StreamTrackAlertContext } from "../../domain";

/**
 * Reacts to `stream.inspected`, evaluates content rules against the inspected
 * tracks (with the stream's track expectations as context), and reconciles the
 * signals into alerts for that one stream.
 */
@Injectable()
export class TrackAlertRuler {
    constructor(
        private readonly streamQuery: StreamQueryService,
        private readonly ruleEvaluator: RuleEvaluator,
        private readonly reconcile: AlertReconcileService,
    ) {}

    @OnEvent(SystemEventNames.STREAM_INSPECTED)
    async onStreamInspected(payload: StreamInspectedPayload): Promise<void> {
        if (payload.lastError !== null) {
            return;
        }

        const stream = await this.streamQuery.findByName(payload.streamName);
        if (!stream) {
            return;
        }

        const context: StreamTrackAlertContext = {
            metadata: stream.metadata
                ? {
                      hasExpectedVideo: stream.metadata.hasExpectedVideo,
                      hasExpectedAudio: stream.metadata.hasExpectedAudio,
                  }
                : undefined,
        };

        const signals = this.ruleEvaluator.evaluate(
            payload.streamName,
            payload.tracks,
            context,
            STREAM_TRACK_ALERT_RULES,
        );

        await this.reconcile.reconcileSubject(AlertSource.INSPECTION, payload.streamName, signals);
    }
}

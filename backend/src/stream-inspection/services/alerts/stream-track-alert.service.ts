import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";

import { StreamTrack } from "@/common";
import { StreamQueryService } from "@/streams";
import { AlertEvaluationService } from "@/alerts";
import { StreamInspectedPayload, SystemEventNames } from "@/common";

import { STREAM_TRACK_ALERT_RULES, StreamTrackAlertContext } from "../../domain";

@Injectable()
export class StreamTrackAlertService {
    constructor(
        private readonly streamQuery: StreamQueryService,
        private readonly alerts: AlertEvaluationService,
    ) {}

    @OnEvent(SystemEventNames.STREAM_INSPECTED)
    async handleStreamInspected(payload: StreamInspectedPayload): Promise<void> {
        if (payload.lastError !== null) {
            return;
        }

        await this.evaluate(payload.streamName, payload.tracks);
    }

    async evaluate(streamName: string, tracks: StreamTrack[]): Promise<void> {
        const stream = await this.streamQuery.findByName(streamName);
        if (!stream) return;

        const alertContext: StreamTrackAlertContext = {
            metadata: stream.metadata
                ? {
                      hasExpectedAudio: stream.metadata.hasExpectedAudio,
                      hasExpectedVideo: stream.metadata.hasExpectedVideo,
                  }
                : undefined,
        };

        await this.alerts.evaluateAndCreate(
            streamName,
            tracks,
            alertContext,
            STREAM_TRACK_ALERT_RULES,
        );
    }
}

import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";

import { AlertRuleExecutionService } from "@/alerts";
import { StreamTrack } from "@/common";
import { StreamsFacadeService } from "@/streams";
import { StreamInspectedPayload, SystemEventNames } from "@/system-events";

import { StreamTrackAlertContext } from "../../domain/types/stream-inspection.types";
import { STREAM_TRACK_ALERT_RULES } from "../../domain/consts/stream-track-alert-rules.const";

@Injectable()
export class StreamTrackAlertService {
    constructor(
        private readonly streams: StreamsFacadeService,
        private readonly alertRuleExecution: AlertRuleExecutionService,
    ) {}

    @OnEvent(SystemEventNames.STREAM_INSPECTED)
    async handleStreamInspected(payload: StreamInspectedPayload): Promise<void> {
        if (payload.lastError !== null) {
            return;
        }

        await this.evaluate(payload.streamName, payload.tracks);
    }

    async evaluate(streamName: string, tracks: StreamTrack[]): Promise<void> {
        const stream = await this.streams.findByName(streamName);
        if (!stream) return;

        const alertContext: StreamTrackAlertContext = {
            metadata: stream.metadata
                ? {
                      hasExpectedAudio: stream.metadata.hasExpectedAudio,
                      hasExpectedVideo: stream.metadata.hasExpectedVideo,
                  }
                : undefined,
        };

        await this.alertRuleExecution.evaluateAndEmit(
            streamName,
            tracks,
            alertContext,
            STREAM_TRACK_ALERT_RULES,
        );
    }
}

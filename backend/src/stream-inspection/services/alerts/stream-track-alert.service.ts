import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";

import { StreamTrack, StreamTrackAlertContext } from "../../domain";
import { StreamQueryService } from "../../../streams/services/query";
import { STREAM_TRACK_ALERT_RULES } from "./stream-track-alert-rules";
import { RuleEvaluationCoordinatorService, StreamInspectedPayload } from "../../../common";

@Injectable()
export class StreamTrackAlertService {
    constructor(
        private readonly streamQuery: StreamQueryService,
        private readonly ruleEvaluator: RuleEvaluationCoordinatorService,
    ) {}

    @OnEvent("stream.inspected")
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
                      expectedAudio: stream.metadata.expectedAudio,
                      expectedVideo: stream.metadata.expectedVideo,
                  }
                : undefined,
        };

        await this.ruleEvaluator.evaluateAndEmit(
            streamName,
            tracks,
            alertContext,
            STREAM_TRACK_ALERT_RULES,
        );
    }
}

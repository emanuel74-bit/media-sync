import { V3TrackItem } from "@/infrastructure";
import { StreamTrack, TrackType } from "@/common";

import { TrackParser } from "../track-parser.types";

export class SubtitleTrackParser implements TrackParser {
    canParse(type: string): boolean {
        return type === TrackType.SUBTITLE;
    }

    parse(track: V3TrackItem): StreamTrack {
        return {
            type: TrackType.SUBTITLE,
            codec: track.codec,
            language: track.language,
        };
    }
}

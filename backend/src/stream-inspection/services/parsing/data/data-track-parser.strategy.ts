import { V3TrackItem } from "@/infrastructure";
import { StreamTrack, TrackType } from "@/common";

import { TrackParser } from "../track-parser.types";

export class DataTrackParser implements TrackParser {
    canParse(type: string): boolean {
        return type === TrackType.DATA;
    }

    parse(track: V3TrackItem): StreamTrack {
        return {
            type: TrackType.DATA,
            codec: track.codec,
            language: track.language,
        };
    }
}

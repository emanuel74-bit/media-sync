import { V3TrackItem } from "@/infrastructure";
import { StreamTrack, TrackType } from "@/common";

export class DataTrackParser {
    parse(track: V3TrackItem): StreamTrack {
        return {
            type: TrackType.DATA,
            codec: track.codec,
            language: track.language,
        };
    }
}

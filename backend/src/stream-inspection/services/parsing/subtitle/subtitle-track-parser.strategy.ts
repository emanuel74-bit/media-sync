import { V3TrackItem } from "@/media-mtx";
import { StreamTrack, TrackType } from "@/common";

export class SubtitleTrackParser {
    parse(track: V3TrackItem): StreamTrack {
        return {
            type: TrackType.SUBTITLE,
            codec: track.codec,
            language: track.language,
        };
    }
}

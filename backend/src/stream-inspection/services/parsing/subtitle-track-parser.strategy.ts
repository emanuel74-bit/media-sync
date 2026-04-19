import { TrackParser } from "../../domain/types/track-parser.type";
import { StreamTrack, TrackType } from "../../../common/domain";
import { V3TrackItem } from "../../../infrastructure/media-mtx/types";

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

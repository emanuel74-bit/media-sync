import { TrackParser } from "../../domain/types/track-parser.type";
import { StreamTrack, TrackType } from "../../../common/domain";
import { V3TrackItem } from "../../../infrastructure/media-mtx/types";

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

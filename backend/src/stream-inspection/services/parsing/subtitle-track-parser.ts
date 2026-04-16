import { StreamTrack } from "../../domain";
import { TrackType } from "../../../common/domain";
import { V3TrackItem } from "../../../infrastructure/media-mtx/types";
import { TrackParser } from "./track-parser.interface";

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

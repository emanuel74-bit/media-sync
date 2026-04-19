import { TrackParser } from "../../domain/types/track-parser.type";
import { StreamTrack, TrackType } from "../../../common/domain";
import { V3TrackItem } from "../../../infrastructure/media-mtx/types";

export class VideoTrackParser implements TrackParser {
    canParse(type: string): boolean {
        return type === TrackType.VIDEO;
    }

    parse(track: V3TrackItem): StreamTrack {
        return {
            type: TrackType.VIDEO,
            codec: track.codec,
            width: track.width,
            height: track.height,
            fps: track.fps,
        };
    }
}

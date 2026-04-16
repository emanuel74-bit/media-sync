import { StreamTrack } from "../../domain";
import { TrackType } from "../../../common";
import { V3TrackItem } from "../../../infrastructure/media-mtx/types";
import { TrackParser } from "./track-parser.interface";

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

import { V3TrackItem } from "@/infrastructure";
import { StreamTrack, TrackType } from "@/common";

import { TrackParser } from "../track-parser.types";

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

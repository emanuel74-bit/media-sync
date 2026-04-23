import { V3TrackItem } from "@/infrastructure";
import { StreamTrack, TrackType } from "@/common";

export class VideoTrackParser {
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

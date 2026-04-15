import { StreamTrack } from "../../domain";
import { TrackType } from "../../../common";
import { V3PathItem, V3TrackItem } from "../../../infrastructure/media-mtx/types";

export function parseTracksFromPathItem(item: V3PathItem): StreamTrack[] {
    return (item.tracks ?? []).map(parseTrack).filter((t): t is StreamTrack => t !== null);
}

function parseTrack(track: V3TrackItem): StreamTrack | null {
    switch (track.type) {
        case TrackType.VIDEO:
            return {
                type: TrackType.VIDEO,
                codec: track.codec,
                width: track.width,
                height: track.height,
                fps: track.fps,
            };
        case TrackType.AUDIO:
            return {
                type: TrackType.AUDIO,
                codec: track.codec,
                channels: track.channels,
                sampleRate: track.sampleRate,
                language: track.language,
            };
        case TrackType.DATA:
        case TrackType.SUBTITLE:
            return {
                ...track,
                type: track.type as TrackType,
                codec: track.codec,
                language: track.language,
            };
        default:
            return null;
    }
}

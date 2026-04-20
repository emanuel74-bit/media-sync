import { StreamTrack } from "../../../common/domain";
import { DataTrackParser } from "./data-track-parser.strategy";
import { VideoTrackParser } from "./video-track-parser.strategy";
import { AudioTrackParser } from "./audio-track-parser.strategy";
import { TrackParser } from "../../domain/types/track-parser.types";
import { V3PathItem } from "../../../infrastructure/media-mtx/types";
import { SubtitleTrackParser } from "./subtitle-track-parser.strategy";

const TRACK_PARSERS: TrackParser[] = [
    new VideoTrackParser(),
    new AudioTrackParser(),
    new DataTrackParser(),
    new SubtitleTrackParser(),
];

export function parseTracksFromPathItem(item: V3PathItem): StreamTrack[] {
    return (item.tracks ?? [])
        .map((track) => {
            const parser = TRACK_PARSERS.find((p) => p.canParse(track.type));
            if (!parser) {
                return null;
            }
            return parser.parse(track);
        })
        .filter((t): t is StreamTrack => t !== null);
}

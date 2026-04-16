import { StreamTrack } from "../../domain";
import { V3PathItem } from "../../../infrastructure/media-mtx/types";
import { TrackParser } from "./track-parser.interface";
import { VideoTrackParser } from "./video-track-parser";
import { AudioTrackParser } from "./audio-track-parser";
import { DataTrackParser } from "./data-track-parser";
import { SubtitleTrackParser } from "./subtitle-track-parser";

const TRACK_PARSERS: TrackParser[] = [
    new VideoTrackParser(),
    new AudioTrackParser(),
    new DataTrackParser(),
    new SubtitleTrackParser(),
];

export function parseTracksFromPathItem(item: V3PathItem): StreamTrack[] {
    return (item.tracks ?? [])
        .map((track) => TRACK_PARSERS.find((p) => p.canParse(track.type))?.parse(track) ?? null)
        .filter((t): t is StreamTrack => t !== null);
}

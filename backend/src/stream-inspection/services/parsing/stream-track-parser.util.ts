import { StreamTrack } from "@/common";
import { V3PathItem } from "@/infrastructure";

import { DataTrackParser } from "./data";
import { VideoTrackParser } from "./video";
import { AudioTrackParser } from "./audio";
import { SubtitleTrackParser } from "./subtitle";
import { TrackParser } from "./track-parser.types";

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

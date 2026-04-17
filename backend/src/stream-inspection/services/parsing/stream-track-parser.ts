import { Logger } from "@nestjs/common";

import { StreamTrack } from "../../../common/domain";
import { DataTrackParser } from "./data-track-parser";
import { TrackParser } from "./track-parser.interface";
import { VideoTrackParser } from "./video-track-parser";
import { AudioTrackParser } from "./audio-track-parser";
import { SubtitleTrackParser } from "./subtitle-track-parser";
import { V3PathItem } from "../../../infrastructure/media-mtx/types";

const logger = new Logger("StreamTrackParser");

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
                logger.warn(`Unrecognized track type: ${track.type}`);
                return null;
            }
            return parser.parse(track);
        })
        .filter((t): t is StreamTrack => t !== null);
}

import { StreamTrack, TrackType } from "@/common";
import { V3PathItem } from "@/infrastructure";

import { DataTrackParser } from "./data";
import { VideoTrackParser } from "./video";
import { AudioTrackParser } from "./audio";
import { SubtitleTrackParser } from "./subtitle";

const videoParser = new VideoTrackParser();
const audioParser = new AudioTrackParser();
const dataParser = new DataTrackParser();
const subtitleParser = new SubtitleTrackParser();

export function parseTracksFromPathItem(item: V3PathItem): StreamTrack[] {
    return (item.tracks ?? [])
        .map((track) => {
            switch (track.type) {
                case TrackType.VIDEO:
                    return videoParser.parse(track);
                case TrackType.AUDIO:
                    return audioParser.parse(track);
                case TrackType.DATA:
                    return dataParser.parse(track);
                case TrackType.SUBTITLE:
                    return subtitleParser.parse(track);
                default:
                    return null;
            }
        })
        .filter((t): t is StreamTrack => t !== null);
}

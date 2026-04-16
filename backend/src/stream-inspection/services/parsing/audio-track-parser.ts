import { StreamTrack } from "../../../domain";
import { TrackType } from "../../../../common";
import { V3TrackItem } from "../../../../infrastructure/media-mtx/types";
import { TrackParser } from "./track-parser.interface";

export class AudioTrackParser implements TrackParser {
    canParse(type: string): boolean {
        return type === TrackType.AUDIO;
    }

    parse(track: V3TrackItem): StreamTrack {
        return {
            type: TrackType.AUDIO,
            codec: track.codec,
            channels: track.channels,
            sampleRate: track.sampleRate,
            language: track.language,
        };
    }
}

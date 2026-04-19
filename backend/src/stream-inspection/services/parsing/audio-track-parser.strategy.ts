import { TrackParser } from "../../domain/types/track-parser.type";
import { StreamTrack, TrackType } from "../../../common/domain";
import { V3TrackItem } from "../../../infrastructure/media-mtx/types";

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

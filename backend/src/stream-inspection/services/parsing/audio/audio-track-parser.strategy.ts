import { V3TrackItem } from "@/media-mtx";
import { StreamTrack, TrackType } from "@/common";

export class AudioTrackParser {
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

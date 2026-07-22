import { TrackType } from "../enums";

/** Describes a single media track within a stream, used in events and inspection records. */
export interface StreamTrack {
    type: TrackType;
    codec?: string;
    language?: string;
    bitrate?: number;
    width?: number;
    height?: number;
    fps?: number;
    channels?: number;
    sampleRate?: number;
}

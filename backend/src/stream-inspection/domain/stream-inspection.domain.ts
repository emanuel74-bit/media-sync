import { PodRole, TrackType } from "../../common";

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

export interface StreamTrackAlertContext {
    metadata?: {
        expectedVideo?: boolean;
        expectedAudio?: boolean;
    };
}

export interface StreamInspectionRecord {
    streamName: string;
    source: PodRole;
    tracks: StreamTrack[];
    metadata: Record<string, unknown>;
    lastError?: string | null;
    inspectedAt: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

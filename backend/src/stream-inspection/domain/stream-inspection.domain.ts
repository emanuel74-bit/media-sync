import { PodRole, StreamTrack } from "../../common/domain";

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

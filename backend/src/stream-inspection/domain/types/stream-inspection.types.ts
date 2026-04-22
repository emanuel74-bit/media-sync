import { PodRole, StreamTrack } from "@/common";

export interface StreamTrackAlertContext {
    metadata?: {
        hasExpectedVideo?: boolean;
        hasExpectedAudio?: boolean;
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

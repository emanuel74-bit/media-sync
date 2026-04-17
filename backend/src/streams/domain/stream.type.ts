import { StreamStatus } from "../../common/domain";

/**
 * Open-ended metadata stored on a stream record.
 * Known fields come from discovery (video/audio codec info, path stats);
 * additional keys are allowed for forward-compatibility.
 */
export interface StreamMetadata {
    codec?: string;
    width?: number;
    height?: number;
    fps?: number;
    channels?: number;
    sampleRate?: number;
    bytesReceived?: number;
    bytesSent?: number;
    readers?: number;
    hasExpectedVideo?: boolean;
    hasExpectedAudio?: boolean;
    [key: string]: unknown;
}

export interface Stream {
    name: string;
    source: string;
    status: StreamStatus;
    metadata: StreamMetadata;
    isEnabled: boolean;
    lastSeenAt?: Date | null;
    lastSyncedAt?: Date | null;
    lastError?: string | null;
    activeConsumers: number;
    isManual: boolean;
    assignedPod?: string | null;
    assignedAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface StreamAssignmentInfo {
    name: string;
    assignedPod?: string | null;
    assignedAt?: Date | null;
    status: StreamStatus;
}

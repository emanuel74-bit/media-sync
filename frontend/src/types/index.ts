export type StreamStatus =
    | "discovered"
    | "assigned"
    | "active"
    | "inactive"
    | "error";

export interface Stream {
    _id: string;
    name: string;
    source: string;
    status: StreamStatus;
    metadata: Record<string, any>;
    isEnabled: boolean;
    lastSeenAt?: string;
    lastSyncedAt?: string;
    lastError?: string;
    activeConsumers: number;
    assignedPod?: string;
    assignedAt?: string;
    createdAt: string;
    updatedAt: string;
}

export interface Alert {
    _id: string;
    streamName: string;
    type: string;
    severity: "info" | "warning" | "critical";
    message: string;
    resolved: boolean;
    resolvedAt?: string;
    createdAt: string;
    updatedAt: string;
}

export interface Metric {
    _id: string;
    streamName: string;
    context: "ingest" | "cluster";
    bitrate: number;
    fps: number;
    latency: number;
    jitter: number;
    packetLoss: number;
    consumers: number;
    createdAt: string;
    updatedAt: string;
}

export interface Pod {
    _id: string;
    podId: string;
    host?: string;
    type: "ingest" | "cluster";
    tags: string[];
    status: "active" | "inactive" | "draining";
    lastHeartbeatAt: string;
    createdAt: string;
    updatedAt: string;
}

export interface StreamTrack {
    type: "video" | "audio" | "data" | "subtitle";
    codec?: string;
    language?: string;
    bitrate?: number;
    width?: number;
    height?: number;
    fps?: number;
    channels?: number;
    sampleRate?: number;
    [key: string]: any;
}

export interface StreamInspection {
    _id: string;
    streamName: string;
    source: "ingest" | "cluster";
    tracks: StreamTrack[];
    metadata: Record<string, any>;
    lastError?: string;
    inspectedAt: string;
    createdAt: string;
    updatedAt: string;
}

export interface StreamAssignment {
    name: string;
    assignedPod: string | null;
    assignedAt?: string | null;
}

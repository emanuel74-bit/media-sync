/**
 * TypeScript shapes for the MediaMTX HTTP API (v3 paths API).
 * These match the JSON structures returned by `/v3/paths/list` and related endpoints.
 */

/** A single media track entry inside a V3 path item. */
export interface V3TrackItem {
    type: "video" | "audio" | "data" | "subtitle" | string;
    codec?: string;
    width?: number;
    height?: number;
    fps?: number;
    channels?: number;
    sampleRate?: number;
    language?: string;
}

/** A single item from the `/v3/paths/list` response. */
export interface V3PathItem {
    name?: string;
    source?: string;
    ready?: boolean;
    bytesReceived?: number;
    bytesSent?: number;
    readers?: number;
    tracks?: V3TrackItem[];
}

/** Metadata extracted from a V3 path about network stats. */
export interface StreamPathMetadata {
    bytesReceived?: number;
    bytesSent?: number;
    readers?: number;
}

/** Runtime statistics for a stream (bitrate, fps, latency, etc.). */
export interface StreamStats {
    bitrate?: number;
    fps?: number;
    latency?: number;
    jitter?: number;
    packetLoss?: number;
    consumers?: number;
    [key: string]: unknown;
}

/** Result returned when creating a cluster pull pipeline. */
export interface PipelineCreateResult {
    alreadyExists?: boolean;
    [key: string]: unknown;
}

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

/**
 * The `source` field of a V3 path. The real MediaMTX v3 API returns an object
 * (`{ type, id }`) describing what feeds the path, or `null` when not ready.
 * The string form is tolerated for older shapes and test fixtures.
 */
export type V3PathSource = string | { type?: string; id?: string } | null;

/** A single item from the `/v3/paths/list` response. */
export interface V3PathItem {
    name?: string;
    source?: V3PathSource;
    ready?: boolean;
    bytesReceived?: number;
    bytesSent?: number;
    // Real v3 returns an array of reader descriptors; older/mocked shapes use a count.
    readers?: number | unknown[];
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
}

/** Result returned when creating a cluster pull pipeline. */
export interface PipelineCreateResult {
    alreadyExists?: boolean;
}

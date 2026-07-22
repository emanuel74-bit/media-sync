export interface SyncDiscoveryMetadata {
    bytesReceived?: number;
    bytesSent?: number;
    readers?: number;
}

export interface SyncDiscoveredStream {
    name: string;
    /** The pullable source. Absent for a targeted activation, which preserves the reserved source. */
    source?: string;
    status: string;
    /** The ingest node this stream was discovered on (multi-ingest per-node origin). */
    ingestNode?: string;
    video?: { codec: string; width: number; height: number; fps: number };
    audio?: { codec: string; channels: number; sampleRate: number };
    metadata?: SyncDiscoveryMetadata;
}

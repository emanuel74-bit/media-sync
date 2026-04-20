export interface SyncDiscoveryMetadata {
    bytesReceived?: number;
    bytesSent?: number;
    readers?: number;
}

export interface SyncDiscoveredStream {
    name: string;
    source: string;
    status: string;
    video?: { codec: string; width: number; height: number; fps: number };
    audio?: { codec: string; channels: number; sampleRate: number };
    metadata?: SyncDiscoveryMetadata;
}

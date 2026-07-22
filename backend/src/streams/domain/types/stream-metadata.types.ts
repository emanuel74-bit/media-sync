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

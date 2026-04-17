import { StreamPathMetadata } from "./media-mtx.type";

export type MediaMtxStreamInfo = {
    name: string;
    source: string;
    status: string;
    video?: { codec: string; width: number; height: number; fps: number };
    audio?: { codec: string; channels: number; sampleRate: number };
    metadata?: StreamPathMetadata;
};

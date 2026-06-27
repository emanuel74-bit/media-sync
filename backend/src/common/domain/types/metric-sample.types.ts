import { PodRole } from "../enums";

/** Operational counters for a whole MediaMTX node (how loaded the service is). */
export interface NodeMetricSample {
    context: PodRole;
    node: string;
    paths: number;
    rtspConns: number;
    rtspSessions: number;
    rtmpConns: number;
    srtConns: number;
    webrtcSessions: number;
    hlsMuxers: number;
}

/** Operational data for a single path on a single MediaMTX node. */
export interface PathMetricSample {
    streamName: string;
    context: PodRole;
    node: string;
    state: string;
    ready: boolean;
    bytesReceived: number;
    bytesSent: number;
    readers: number;
    framesInError: number;
}

import { PodRole } from "../../common";

export interface NewMetricData {
    streamName: string;
    context: PodRole;
    bitrate: number;
    fps: number;
    latency: number;
    jitter: number;
    packetLoss: number;
    consumers: number;
}

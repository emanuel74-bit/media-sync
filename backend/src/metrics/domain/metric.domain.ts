import { PodRole } from "../../common/domain";

export interface Metric {
    streamName: string;
    context: PodRole;
    bitrate: number;
    fps: number;
    latency: number;
    jitter: number;
    packetLoss: number;
    consumers: number;
    createdAt?: Date;
}

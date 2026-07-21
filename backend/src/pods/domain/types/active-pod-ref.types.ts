import { PodRole } from "@/common";

export interface ActivePodRef {
    podId: string;
    host: string;
    apiPort: number;
    rtspPort: number;
    metricsPort: number;
    type?: PodRole;
}

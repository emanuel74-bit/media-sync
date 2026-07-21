import { NodeRole } from "@/common";

export interface ActiveNodeRef {
    nodeId: string;
    host: string;
    apiPort: number;
    rtspPort: number;
    metricsPort: number;
    type?: NodeRole;
}

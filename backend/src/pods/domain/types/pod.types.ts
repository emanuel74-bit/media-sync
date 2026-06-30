import { PodRole, PodStatus } from "@/common";

export interface Pod {
    podId: string;
    /** Reachable address (IP/hostname) — the sole source for building this pod's client URL. */
    host: string;
    type: PodRole;
    status: PodStatus;
    lastHeartbeatAt: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

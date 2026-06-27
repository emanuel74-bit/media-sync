import { PodRole } from "@/common";

/** Host resource usage a pod reports (percentages 0–100). */
export interface NodeResources {
    cpu: number;
    memory: number;
    disk: number;
}

export interface PodRegistrationData {
    podId: string;
    host?: string;
    tags?: string[];
    type?: PodRole;
    resources?: NodeResources;
}

export interface PodHeartbeatData {
    podId: string;
    resources?: NodeResources;
}

import { PodRole } from "../enums";

/** Host resource usage a pod self-reports (percentages 0–100). */
export interface NodeResourceSample {
    podId: string;
    context: PodRole;
    cpu: number;
    memory: number;
    disk: number;
}

import { NodeRole } from "../enums";

/** Host resource usage a node self-reports (percentages 0–100). */
export interface NodeResourceSample {
    nodeId: string;
    context: NodeRole;
    cpu: number;
    memory: number;
    disk: number;
}

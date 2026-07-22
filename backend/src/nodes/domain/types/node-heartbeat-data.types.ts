import { NodeResources } from "./node-resources.types";

export interface NodeHeartbeatData {
    nodeId: string;
    resources?: NodeResources;
}

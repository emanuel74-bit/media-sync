import { NodeResources } from "./node-resources.types";

export interface PodHeartbeatData {
    podId: string;
    resources?: NodeResources;
}

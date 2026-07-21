import { NodeRole } from "@/common";

import { NodeResources } from "./node-resources.types";

export interface NodeRegistrationData {
    nodeId: string;
    host: string;
    apiPort?: number;
    rtspPort?: number;
    metricsPort?: number;
    type: NodeRole;
    resources?: NodeResources;
}

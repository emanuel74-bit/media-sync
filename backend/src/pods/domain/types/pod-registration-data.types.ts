import { PodRole } from "@/common";

import { NodeResources } from "./node-resources.types";

export interface PodRegistrationData {
    podId: string;
    host: string;
    apiPort?: number;
    rtspPort?: number;
    metricsPort?: number;
    type: PodRole;
    resources?: NodeResources;
}

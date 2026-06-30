import { PodRole } from "@/common";

import { NodeResources } from "./node-resources.types";

export interface PodRegistrationData {
    podId: string;
    host: string;
    type: PodRole;
    resources?: NodeResources;
}

import { PodRole } from "@/common";

export interface ActivePodRef {
    podId: string;
    host?: string;
    type?: PodRole;
}

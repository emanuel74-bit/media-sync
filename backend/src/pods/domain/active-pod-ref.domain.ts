import { PodRole } from "../../common/domain";

export interface ActivePodRef {
    podId: string;
    host?: string;
    type?: PodRole;
}

import { PodRole } from "../../common/domain";

export interface PodRegistrationRequest {
    podId: string;
    host?: string;
    tags?: string[];
    type?: PodRole;
}

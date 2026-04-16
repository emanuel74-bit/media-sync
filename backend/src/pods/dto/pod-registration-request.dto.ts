import { PodRole } from "../../common";

export interface PodRegistrationRequest {
    podId: string;
    host?: string;
    tags?: string[];
    type?: PodRole;
}

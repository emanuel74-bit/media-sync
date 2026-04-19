import { PodRole } from "../../../common/domain";

export interface PodRegistrationData {
    podId: string;
    host?: string;
    tags?: string[];
    type?: PodRole;
}

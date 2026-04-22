import { PodRole } from "@/common";

export interface PodRegistrationData {
    podId: string;
    host?: string;
    tags?: string[];
    type?: PodRole;
}

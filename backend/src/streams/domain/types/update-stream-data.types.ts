import { StreamStatus } from "@/common";

export interface UpdateStreamData {
    source?: string;
    isEnabled?: boolean;
    status?: StreamStatus;
}

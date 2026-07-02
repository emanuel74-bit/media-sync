import { StreamStatus } from "@/common";

export interface StreamAssignmentInfo {
    name: string;
    assignedPod?: string | null;
    assignedAt?: Date | null;
    status: StreamStatus;
}

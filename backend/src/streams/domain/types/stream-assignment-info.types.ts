import { StreamStatus } from "@/common";

export interface StreamAssignmentInfo {
    name: string;
    assignedNode?: string | null;
    assignedAt?: Date | null;
    status: StreamStatus;
}

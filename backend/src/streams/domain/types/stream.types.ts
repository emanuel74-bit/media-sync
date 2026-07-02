import { StreamStatus } from "@/common";

import { StreamMetadata } from "./stream-metadata.types";

export interface Stream {
    name: string;
    source: string;
    status: StreamStatus;
    metadata: StreamMetadata;
    isEnabled: boolean;
    lastSeenAt?: Date | null;
    lastSyncedAt?: Date | null;
    lastError?: string | null;
    activeConsumers: number;
    isManual: boolean;
    assignedPod?: string | null;
    assignedAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
}

import { StreamStatus } from "@/common";

import { StreamMetadata } from "./stream-metadata.types";

/** Credential-free stream representation returned by the general Streams API. */
export interface PublicStream {
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
    ingestNode?: string | null;
    reservedUntil?: Date | null;
    assignedNode?: string | null;
    assignedAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
}

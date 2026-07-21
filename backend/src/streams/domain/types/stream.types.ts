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
    /** The ingest node this stream is published on — the relay pulls from this specific node. */
    ingestPod?: string | null;
    /** When a `RESERVED` publish slot expires if no media arrives; cleared once the stream goes live. */
    reservedUntil?: Date | null;
    /** Opaque per-reservation secret the publisher presents; validated by `/api/ingest/auth`. */
    publishToken?: string | null;
    assignedPod?: string | null;
    assignedAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
}

/** All possible lifecycle states for a stream record. */
export enum StreamStatus {
    CREATED = "created",
    /** Publish slot reserved on an ingest node; awaiting the publisher's first media. */
    RESERVED = "reserved",
    DISCOVERED = "discovered",
    PENDING_ASSIGNMENT = "pending_assignment",
    ASSIGNED = "assigned",
    SYNCED = "synced",
    SYNC_ERROR = "sync_error",
    STALE = "stale",
}

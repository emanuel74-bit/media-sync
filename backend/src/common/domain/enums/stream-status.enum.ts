/** All possible lifecycle states for a stream record. */
export enum StreamStatus {
    CREATED = "created",
    DISCOVERED = "discovered",
    PENDING_ASSIGNMENT = "pending_assignment",
    ASSIGNED = "assigned",
    SYNCED = "synced",
    SYNC_ERROR = "sync_error",
    STALE = "stale",
}

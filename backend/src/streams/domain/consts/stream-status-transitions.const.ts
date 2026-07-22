import { StreamStatus } from "@/common";

/**
 * Legal persisted lifecycle moves. Re-applying the current state is always idempotent and is
 * handled by `StreamStatusService`; birth states are set only by the corresponding create flow.
 */
export const STREAM_STATUS_TRANSITIONS: Readonly<Record<StreamStatus, readonly StreamStatus[]>> = {
    [StreamStatus.CREATED]: [
        StreamStatus.PENDING_ASSIGNMENT,
        StreamStatus.ASSIGNED,
        StreamStatus.STALE,
    ],
    [StreamStatus.RESERVED]: [StreamStatus.DISCOVERED],
    [StreamStatus.DISCOVERED]: [
        StreamStatus.PENDING_ASSIGNMENT,
        StreamStatus.ASSIGNED,
        StreamStatus.STALE,
    ],
    [StreamStatus.PENDING_ASSIGNMENT]: [StreamStatus.ASSIGNED, StreamStatus.STALE],
    [StreamStatus.ASSIGNED]: [
        StreamStatus.PENDING_ASSIGNMENT,
        StreamStatus.SYNCED,
        StreamStatus.SYNC_ERROR,
        StreamStatus.STALE,
    ],
    [StreamStatus.SYNCED]: [
        StreamStatus.PENDING_ASSIGNMENT,
        StreamStatus.ASSIGNED,
        StreamStatus.SYNC_ERROR,
        StreamStatus.STALE,
    ],
    [StreamStatus.SYNC_ERROR]: [
        StreamStatus.PENDING_ASSIGNMENT,
        StreamStatus.ASSIGNED,
        StreamStatus.SYNCED,
        StreamStatus.STALE,
    ],
    [StreamStatus.STALE]: [StreamStatus.DISCOVERED],
};

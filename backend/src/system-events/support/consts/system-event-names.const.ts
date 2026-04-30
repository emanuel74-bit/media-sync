export const SystemEventNames = {
    STREAM_SYNCED: "stream.synced",
    STREAM_REMOVED: "stream.removed",
    STREAM_ASSIGNED: "stream.assigned",
    STREAM_UNASSIGNED: "stream.unassigned",
    STREAM_INSPECTED: "stream.inspected",
    STREAM_SYNC_FAILURE: "stream.sync.failure",
    ALERT_CREATE: "alert.create",
    ALERT_CREATED: "alert.created",
    ALERT_RESOLVED: "alert.resolved",
    METRIC_COLLECTED: "metric.collected",
    POD_REGISTERED: "pod.registered",
    POD_REMOVED: "pod.removed",
    SYNC_TICK: "sync.tick",
} as const;

export type SystemEventName = (typeof SystemEventNames)[keyof typeof SystemEventNames];

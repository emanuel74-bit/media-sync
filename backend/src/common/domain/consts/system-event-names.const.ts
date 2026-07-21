export const SystemEventNames = {
    STREAM_SYNCED: "stream.synced",
    STREAM_REMOVED: "stream.removed",
    STREAM_RESERVED: "stream.reserved",
    STREAM_ASSIGNED: "stream.assigned",
    STREAM_UNASSIGNED: "stream.unassigned",
    STREAM_INSPECTED: "stream.inspected",
    METRICS_COLLECTED: "metrics.collected",
    NODE_SAMPLED: "node.sampled",
    ALERT_CREATED: "alert.created",
    ALERT_UPDATED: "alert.updated",
    ALERT_RESOLVED: "alert.resolved",
    POD_REGISTERED: "pod.registered",
    SYNC_TICK: "sync.tick",
} as const;

export type SystemEventName = (typeof SystemEventNames)[keyof typeof SystemEventNames];

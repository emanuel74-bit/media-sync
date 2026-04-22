import { StreamTrack } from "./stream-track.types";
import { AlertMetricInput } from "./alert-metric-input.types";
import { PodRole, AlertType, StreamStatus, AlertSeverity } from "../enums";

/** Emitted when a stream has been successfully synced to the cluster. */
export interface StreamSyncedPayload {
    name: string;
    assignedPod?: string | null;
    status: StreamStatus;
    lastSyncedAt?: Date;
}

/** Emitted when a stale stream has been removed from the cluster. */
export type StreamRemovedPayload = string;

/** Emitted when a stream is assigned to a pod. */
export interface StreamAssignedPayload {
    streamName: string;
    podId: string;
    assignedAt?: Date | null;
}

/** Emitted when a stream's pod assignment is cleared. */
export type StreamUnassignedPayload = string;

/** Emitted after metric stats are persisted for a stream; consumed by the metrics alert invocation service for threshold checks. */
export interface MetricCollectedPayload {
    streamName: string;
    metric: AlertMetricInput;
}

/** Emitted to request creation of a new alert (event-driven cross-module contract). */
export interface AlertCreateRequestedPayload {
    streamName: string;
    type: AlertType;
    severity: AlertSeverity;
    message: string;
}

/** Emitted when a new alert is created. */
export interface AlertCreatedPayload {
    id: string;
    streamName: string;
    type: string;
    severity: string;
    message: string;
    isResolved: boolean;
    resolvedAt?: Date | null;
}

/** Emitted when an alert is resolved. */
export type AlertResolvedPayload = AlertCreatedPayload;

/** Emitted after each stream inspection cycle for a single stream. */
export interface StreamInspectedPayload {
    streamName: string;
    source: PodRole;
    tracks: StreamTrack[];
    metadata: Record<string, unknown>;
    inspectedAt: Date;
    lastError: string | null;
}

/** Emitted when a pod registers or sends a heartbeat. */
export interface PodRegisteredPayload {
    podId: string;
    type: PodRole;
    host?: string;
    tags?: string[];
    status: string;
    lastHeartbeatAt: Date;
}

/** Emitted when a pod is removed / marked stale. */
export type PodRemovedPayload = string;

/** Emitted on every successful sync tick. */
export interface SyncTickPayload {
    ingest: number;
    cluster: number;
    /** Names of any workflows that failed during this tick. Empty when all workflows succeeded. */
    failures: string[];
}

/** Emitted when a stream sync attempt fails. */
export interface StreamSyncFailurePayload {
    stream: string;
    error: string;
}

import type { AlertMetricInput } from "@/common/domain/types/alert-metric-input.types";
import type { StreamTrack } from "@/common/domain/types/stream-track.types";
import { AlertSeverity } from "@/common/domain/enums/alert-severity.enum";
import { AlertType } from "@/common/domain/enums/alert-type.enum";
import { PodRole } from "@/common/domain/enums/pod-role.enum";
import { StreamStatus } from "@/common/domain/enums/stream-status.enum";

export interface StreamSyncedPayload {
    name: string;
    assignedPod?: string | null;
    status: StreamStatus;
    lastSyncedAt?: Date;
}

export type StreamRemovedPayload = string;

export interface StreamAssignedPayload {
    streamName: string;
    podId: string;
    assignedAt?: Date | null;
}

export type StreamUnassignedPayload = string;

export interface MetricCollectedPayload {
    streamName: string;
    metric: AlertMetricInput;
}

export interface AlertCreateRequestedPayload {
    streamName: string;
    type: AlertType;
    severity: AlertSeverity;
    message: string;
}

export interface AlertCreatedPayload {
    id: string;
    streamName: string;
    type: string;
    severity: string;
    message: string;
    isResolved: boolean;
    resolvedAt?: Date | null;
}

export type AlertResolvedPayload = AlertCreatedPayload;

export interface StreamInspectedPayload {
    streamName: string;
    source: PodRole;
    tracks: StreamTrack[];
    metadata: Record<string, unknown>;
    inspectedAt: Date;
    lastError: string | null;
}

export interface PodRegisteredPayload {
    podId: string;
    type: PodRole;
    host?: string;
    tags?: string[];
    status: string;
    lastHeartbeatAt: Date;
}

export type PodRemovedPayload = string;

export interface SyncTickPayload {
    ingest: number;
    cluster: number;
    failures: string[];
}

export interface StreamSyncFailurePayload {
    stream: string;
    error: string;
}
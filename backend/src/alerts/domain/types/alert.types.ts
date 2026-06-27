import { AlertType, AlertSource, AlertSeverity } from "@/common";

/** Data required to create a new alert. */
export interface AlertCreationData {
    source: AlertSource;
    subject: string;
    type: AlertType;
    severity: AlertSeverity;
    message: string;
}

/** Fields the reconciler may change on an already-open alert (refresh or update). */
export interface AlertUpdateData {
    severity?: AlertSeverity;
    message?: string;
    lastSeenAt: Date;
}

export interface Alert {
    id: string;
    source: AlertSource;
    /** What the alert is about — a stream name (metrics/inspection) or a node id (node). */
    subject: string;
    type: AlertType;
    severity: AlertSeverity;
    message: string;
    isResolved: boolean;
    lastSeenAt?: Date;
    resolvedAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
}

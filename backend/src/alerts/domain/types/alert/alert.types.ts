import { AlertType, AlertSource, AlertSeverity } from "@/common";

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

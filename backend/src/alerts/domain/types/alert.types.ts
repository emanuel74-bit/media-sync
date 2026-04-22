import { AlertSeverity, AlertType } from "@/common";

/** Data required to create a new alert. Moved here from alert.schema to keep schema persistence-only. */
export interface AlertCreationData {
    streamName: string;
    type: AlertType;
    severity: AlertSeverity;
    message: string;
}

export interface Alert {
    id: string;
    streamName: string;
    type: AlertType;
    severity: AlertSeverity;
    message: string;
    isResolved: boolean;
    resolvedAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
}

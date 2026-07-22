import { AlertType, AlertSource, AlertSeverity } from "@/common";

/** Data required to create a new alert. */
export interface AlertCreationData {
    source: AlertSource;
    subject: string;
    type: AlertType;
    severity: AlertSeverity;
    message: string;
}

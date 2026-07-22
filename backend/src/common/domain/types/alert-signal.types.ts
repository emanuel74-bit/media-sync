import { AlertType, AlertSeverity } from "../enums";

/**
 * A single alert condition currently firing for a subject, produced by a ruler.
 * The `subject` is whatever the source alerts on — a stream name, or a node id.
 * Carries no lifecycle state — the alerts feature reconciles signals into alerts.
 */
export interface AlertSignal {
    subject: string;
    type: AlertType;
    severity: AlertSeverity;
    message: string;
}

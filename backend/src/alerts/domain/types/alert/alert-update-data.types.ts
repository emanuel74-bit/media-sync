import { AlertSeverity } from "@/common";

/** Fields the reconciler may change on an already-open alert (refresh or update). */
export interface AlertUpdateData {
    severity?: AlertSeverity;
    message?: string;
    lastSeenAt: Date;
}

import { Alert } from "./alert.types";

/**
 * Outcome of an idempotent create. `created` is false when an open alert for the
 * same (source, subject, type) already existed — i.e. a concurrent reconcile won
 * the race — so callers know not to emit a duplicate `alert.created`.
 */
export interface AlertCreateResult {
    alert: Alert;
    created: boolean;
}

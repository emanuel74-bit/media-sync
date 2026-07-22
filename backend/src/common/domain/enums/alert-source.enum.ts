/** Which producer a reconciled alert originates from (scopes alert reconciliation). */
export enum AlertSource {
    METRICS = "metrics",
    INSPECTION = "inspection",
    NODE = "node",
}

/** Percentage thresholds supplied as context to node-resource rules. */
export interface NodeResourceAlertContext {
    cpu: number;
    memory: number;
    disk: number;
}

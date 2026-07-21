import { AlertType, AlertSeverity } from "@/common";

import { NodeResourceAlertRule } from "../types";

/** Node-resource alerts derived from a node's self-reported host usage (source: node). */
export const NODE_RESOURCE_RULES: NodeResourceAlertRule[] = [
    {
        check: (node, thresholds) => node.cpu > thresholds.cpu,
        type: AlertType.NODE_CPU_HIGH,
        severity: AlertSeverity.WARNING,
        message: (node) => `Node '${node.nodeId}' CPU at ${node.cpu}%`,
    },
    {
        check: (node, thresholds) => node.memory > thresholds.memory,
        type: AlertType.NODE_MEMORY_HIGH,
        severity: AlertSeverity.WARNING,
        message: (node) => `Node '${node.nodeId}' memory at ${node.memory}%`,
    },
    {
        check: (node, thresholds) => node.disk > thresholds.disk,
        type: AlertType.NODE_DISK_HIGH,
        severity: AlertSeverity.CRITICAL,
        message: (node) => `Node '${node.nodeId}' disk at ${node.disk}%`,
    },
];

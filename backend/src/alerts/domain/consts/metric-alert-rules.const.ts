import { AlertType, AlertSeverity } from "@/common";

import { MetricAlertRule } from "../types";

/** Operational alerts derived from MediaMTX per-path metrics (source: metrics). */
export const METRIC_ALERT_RULES: MetricAlertRule[] = [
    {
        check: (path) => !path.ready,
        type: AlertType.STREAM_NOT_READY,
        severity: AlertSeverity.WARNING,
        message: (path) =>
            `Stream '${path.streamName}' is not ready on ${path.context} node ${path.node} (state: ${path.state})`,
    },
    {
        check: (path) => path.framesInError > 0,
        type: AlertType.FRAMES_IN_ERROR,
        severity: AlertSeverity.WARNING,
        message: (path) =>
            `Stream '${path.streamName}' has ${path.framesInError} frame(s) in error on ${path.context} node ${path.node}`,
    },
];

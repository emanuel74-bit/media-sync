import { PathMetricSample, RuntimeAlertRule } from "@/common";

/** Operational rules over a single MediaMTX path metric sample (source: metrics). */
export type MetricAlertRule = RuntimeAlertRule<PathMetricSample, void>;

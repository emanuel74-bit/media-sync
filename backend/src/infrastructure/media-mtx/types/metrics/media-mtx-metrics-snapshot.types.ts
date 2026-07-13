import { NodeMetricSample, PathMetricSample } from "@/common";

/** Everything one node reported in a single /metrics scrape. */
export interface MediaMtxMetricsSnapshot {
    node: NodeMetricSample;
    paths: PathMetricSample[];
}

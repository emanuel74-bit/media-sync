import { NodeMetricSample, PathMetricSample } from "@/common";

/** One parsed line of the Prometheus text exposition format. */
export interface PrometheusSample {
    name: string;
    labels: Record<string, string>;
    value: number;
}

/** Everything one node reported in a single /metrics scrape. */
export interface MediaMtxMetricsSnapshot {
    node: NodeMetricSample;
    paths: PathMetricSample[];
}

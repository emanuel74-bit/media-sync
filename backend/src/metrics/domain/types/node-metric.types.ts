import { NodeMetricSample } from "@/common";

/** A persisted node operational sample. */
export interface NodeMetric extends NodeMetricSample {
    createdAt?: Date;
}

export type NewNodeMetricData = NodeMetricSample;

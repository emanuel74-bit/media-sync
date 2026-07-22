import { PathMetricSample } from "@/common";

/** A persisted per-path operational sample. */
export interface PathMetric extends PathMetricSample {
    createdAt?: Date;
}

export type NewPathMetricData = PathMetricSample;

import { PodRole } from "../enums";
import { StreamTrack } from "./stream-track.types";
import { NodeResourceSample } from "./node-resource-sample.types";
import { NodeMetricSample, PathMetricSample } from "./metric-sample.types";

/** Emitted after each stream inspection cycle for a single stream. */
export interface StreamInspectedPayload {
    streamName: string;
    source: PodRole;
    tracks: StreamTrack[];
    metadata: Record<string, unknown>;
    inspectedAt: Date;
    lastError: string | null;
}

/** Emitted after each MediaMTX metrics scrape cycle, carrying every node + path sample. */
export interface MetricsCollectedPayload {
    nodes: NodeMetricSample[];
    paths: PathMetricSample[];
    collectedAt: Date;
}

/** Emitted when a pod reports its host resource usage (on register/heartbeat). */
export type NodeSampledPayload = NodeResourceSample;

import { StreamTrack, PathMetricSample, NodeResourceSample, RuntimeAlertRule } from "@/common";

/** Operational rules over a single MediaMTX path metric sample (source: metrics). */
export type MetricAlertRule = RuntimeAlertRule<PathMetricSample, void>;

/** Stream-configured track expectations, supplied as context to track rules. */
export interface StreamTrackAlertContext {
    metadata?: {
        hasExpectedVideo?: boolean;
        hasExpectedAudio?: boolean;
    };
}

/** Content rules over a stream's inspected tracks (source: inspection). */
export type StreamTrackAlertRule = RuntimeAlertRule<StreamTrack[], StreamTrackAlertContext>;

/** Percentage thresholds supplied as context to node-resource rules. */
export interface NodeResourceThresholds {
    cpu: number;
    memory: number;
    disk: number;
}

/** Resource rules over a pod's self-reported host usage (source: node). */
export type NodeResourceRule = RuntimeAlertRule<NodeResourceSample, NodeResourceThresholds>;

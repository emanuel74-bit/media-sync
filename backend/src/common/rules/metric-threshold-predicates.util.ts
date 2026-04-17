import { AlertMetricInput } from "../domain";
import { MetricThresholds } from "./metric-thresholds.type";

export function isBitrateLow(
    metric: Pick<AlertMetricInput, "bitrate">,
    threshold: number,
): boolean {
    return metric.bitrate > 0 && metric.bitrate < threshold;
}

export function isPacketLossHigh(
    metric: Pick<AlertMetricInput, "packetLoss">,
    threshold: number,
): boolean {
    return metric.packetLoss > threshold;
}

export function isLatencyHigh(
    metric: Pick<AlertMetricInput, "latency">,
    threshold: number,
): boolean {
    return metric.latency > threshold;
}

export function isMetricDegraded(
    metric: Pick<AlertMetricInput, "packetLoss" | "latency">,
    thresholds: Pick<MetricThresholds, "alertPacketLossThreshold" | "alertLatencyHighThreshold">,
): boolean {
    return (
        isPacketLossHigh(metric, thresholds.alertPacketLossThreshold) ||
        isLatencyHigh(metric, thresholds.alertLatencyHighThreshold)
    );
}

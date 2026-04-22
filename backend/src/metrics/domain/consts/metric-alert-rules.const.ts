import { AlertSeverity, AlertType } from "@/common";
import { isBitrateLow, isLatencyHigh, isPacketLossHigh } from "@/common";

import { MetricAlertRule } from "../types";

export const METRIC_ALERT_RULES: MetricAlertRule[] = [
    {
        check: (metric, thresholds) => isBitrateLow(metric, thresholds.alertBitrateLowThreshold),
        type: AlertType.BITRATE_LOW,
        severity: AlertSeverity.WARNING,
        message: (metric) => `Bitrate dropped below expected threshold: ${metric.bitrate}`,
    },
    {
        check: (metric, thresholds) =>
            isPacketLossHigh(metric, thresholds.alertPacketLossThreshold),
        type: AlertType.PACKET_LOSS,
        severity: AlertSeverity.CRITICAL,
        message: (metric) => `Packet loss ${metric.packetLoss}%`,
    },
    {
        check: (metric, thresholds) => isLatencyHigh(metric, thresholds.alertLatencyHighThreshold),
        type: AlertType.LATENCY_HIGH,
        severity: AlertSeverity.WARNING,
        message: (metric) => `Latency high: ${metric.latency}ms`,
    },
];

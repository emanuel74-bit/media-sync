import { MetricAlertRule } from "./metric-alert-rule.types";
import { AlertSeverity, AlertType } from "../../../common/domain";
import { isBitrateLow, isLatencyHigh, isPacketLossHigh } from "../../../common/rules";

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

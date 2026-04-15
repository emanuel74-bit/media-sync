import { AlertMetricInput, MetricThresholds, RuntimeAlertRule } from "../../../common";

export type MetricAlertThresholds = MetricThresholds;

export type MetricAlertRule = RuntimeAlertRule<AlertMetricInput, MetricAlertThresholds>;

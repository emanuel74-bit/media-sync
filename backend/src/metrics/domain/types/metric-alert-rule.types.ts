import { AlertMetricInput } from "@/common";
import { RuntimeAlertRule } from "@/alerts";
import { MetricThresholds } from "@/common";

export type MetricAlertThresholds = MetricThresholds;

export type MetricAlertRule = RuntimeAlertRule<AlertMetricInput, MetricAlertThresholds>;

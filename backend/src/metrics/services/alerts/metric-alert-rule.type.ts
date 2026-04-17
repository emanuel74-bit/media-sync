import { AlertMetricInput } from "../../../common/domain";
import { MetricThresholds, RuntimeAlertRule } from "../../../common/rules";

export type MetricAlertThresholds = MetricThresholds;

export type MetricAlertRule = RuntimeAlertRule<AlertMetricInput, MetricAlertThresholds>;

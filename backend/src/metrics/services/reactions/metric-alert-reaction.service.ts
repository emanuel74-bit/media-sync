import { Injectable } from "@nestjs/common";

import { Metric } from "../../domain";
import { MetricAlertInvocationService } from "../alerts";

@Injectable()
export class MetricAlertReactionService {
    constructor(private readonly metricAlerts: MetricAlertInvocationService) {}

    async handleCollectedMetric(streamName: string, metric: Metric): Promise<void> {
        await this.metricAlerts.checkMetricsAndAlert(streamName, metric);
    }
}

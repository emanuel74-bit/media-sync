import { Injectable, Logger } from "@nestjs/common";

import { PodRole } from "@/common";

import { StreamFailoverService } from "../failover";
import { MetricAlertInvocationService } from "../alerts";
import { StreamMetricCollectorService } from "./stream-metric-collector.service";

@Injectable()
export class MetricCollectionWorkflowService {
    private readonly logger = new Logger(MetricCollectionWorkflowService.name);

    constructor(
        private readonly metricCollector: StreamMetricCollectorService,
        private readonly metricAlerts: MetricAlertInvocationService,
        private readonly streamFailover: StreamFailoverService,
    ) {}

    async runStreamMetricWorkflow(streamName: string, context: PodRole): Promise<void> {
        try {
            const metric = await this.metricCollector.collectStreamMetric(streamName, context);
            await this.metricAlerts.checkMetricsAndAlert(streamName, metric);
            await this.streamFailover.evaluateAndReassignIfDegraded(streamName, context, metric);
        } catch (error) {
            this.logger.error(`Failed to process metric for stream ${streamName}`, error);
        }
    }
}

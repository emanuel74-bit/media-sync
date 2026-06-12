import { Injectable, Logger } from "@nestjs/common";

import { PodRole } from "@/common";

import { StreamMetricCollectorService } from "./stream-metric-collector.service";
import { MetricAlertReactionService, MetricFailoverReactionService } from "../reactions";

@Injectable()
export class MetricCollectionWorkflowService {
    private readonly logger = new Logger(MetricCollectionWorkflowService.name);

    constructor(
        private readonly metricCollector: StreamMetricCollectorService,
        private readonly alertReaction: MetricAlertReactionService,
        private readonly failoverReaction: MetricFailoverReactionService,
    ) {}

    async runStreamMetricWorkflow(streamName: string, context: PodRole): Promise<void> {
        try {
            const metric = await this.metricCollector.collectStreamMetric(streamName, context);
            await this.alertReaction.handleCollectedMetric(streamName, metric);
            await this.failoverReaction.handleCollectedMetric(streamName, context, metric);
        } catch (error) {
            this.logger.error(`Failed to process metric for stream ${streamName}`, error);
        }
    }
}

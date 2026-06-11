import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";

import { SequentialStreamTaskRunner } from "@/common";
import { MediaMtxStreamListingService } from "@/infrastructure";

import { MetricCollectionWorkflowService } from "./metric-collection-workflow.service";

@Injectable()
export class MetricCollectionService {
    private readonly logger = new Logger(MetricCollectionService.name);

    constructor(
        private readonly mediaMtxListing: MediaMtxStreamListingService,
        private readonly metricWorkflow: MetricCollectionWorkflowService,
        private readonly scheduledWork: SequentialStreamTaskRunner,
    ) {}

    @Cron(CronExpression.EVERY_10_SECONDS)
    async collectMetrics(): Promise<void> {
        const streams = await this.mediaMtxListing.listContextualStreams();
        await this.scheduledWork.processSequential(streams, async ({ stream, context }) => {
            await this.metricWorkflow.runStreamMetricWorkflow(stream.name, context);
        });
    }
}

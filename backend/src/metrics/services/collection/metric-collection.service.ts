import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";

import { SequentialStreamTaskRunner } from "../../../common/services";
import { StreamMetricProcessor } from "./stream-metric-processor.service";
import { MediaMtxStreamListingService } from "../../../infrastructure/media-mtx/services";

@Injectable()
export class MetricCollectionService {
    private readonly logger = new Logger(MetricCollectionService.name);

    constructor(
        private readonly mediaMtxListing: MediaMtxStreamListingService,
        private readonly metricProcessor: StreamMetricProcessor,
        private readonly scheduledWork: SequentialStreamTaskRunner,
    ) {}

    @Cron(CronExpression.EVERY_10_SECONDS)
    async collectMetrics(): Promise<void> {
        const streams = await this.mediaMtxListing.listContextualStreams();
        await this.scheduledWork.processSequential(streams, async ({ stream, context }) => {
            await this.metricProcessor.processStreamMetric(stream.name, context);
        });
    }
}

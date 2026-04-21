import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";

import { ConfigService } from "../../../config";
import { SequentialStreamTaskRunner } from "../../../common/services";
import { StreamMetricProcessor } from "./stream-metric-processor.service";
import { MediaMtxStreamListingService } from "../../../infrastructure/media-mtx/services";

@Injectable()
export class MetricCollectionService implements OnModuleInit, OnModuleDestroy {
    private metricsInterval: NodeJS.Timeout | undefined;

    constructor(
        private readonly mediaMtxListing: MediaMtxStreamListingService,
        private readonly metricProcessor: StreamMetricProcessor,
        private readonly scheduledWork: SequentialStreamTaskRunner,
        private readonly config: ConfigService,
    ) {}

    onModuleInit(): void {
        this.metricsInterval = setInterval(
            () => void this.collectMetrics(),
            this.config.metricsPollInterval,
        );
    }

    onModuleDestroy(): void {
        clearInterval(this.metricsInterval);
    }

    async collectMetrics(): Promise<void> {
        const streams = await this.mediaMtxListing.listContextualStreams();
        await this.scheduledWork.processSequential(streams, async ({ stream, context }) => {
            await this.metricProcessor.processStreamMetric(stream.name, context);
        });
    }
}

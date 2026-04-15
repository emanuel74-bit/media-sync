import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { PodRole } from "../../../common";
import { StreamFailoverService } from "../failover";
import { MetricPersistenceService } from "../persistence";
import { MediaMtxStreamStatsService } from "../../../infrastructure/media-mtx/services";

/**
 * Isolated per-stream metric processing responsibility.
 * Handles stats retrieval, persistence, event emission, and failover evaluation.
 */
@Injectable()
export class MetricProcessorService {
    private readonly logger = new Logger(MetricProcessorService.name);

    constructor(
        private readonly mediaMtxStats: MediaMtxStreamStatsService,
        private readonly metricPersistence: MetricPersistenceService,
        private readonly events: EventEmitter2,
        private readonly streamFailover: StreamFailoverService,
    ) {}

    /**
     * Process a single stream's metrics: fetch, persist, emit, and conditionally evaluate failover.
     */
    async processStreamMetric(streamName: string, context: PodRole): Promise<void> {
        try {
            const stats = await this.mediaMtxStats.getStreamStats(context, streamName);
            const metric = await this.metricPersistence.saveFromStats(streamName, context, stats);

            this.events.emit("metric.collected", { streamName, metric });

            if (context === PodRole.CLUSTER) {
                await this.streamFailover.evaluate(streamName, metric);
            }
        } catch (error) {
            this.logger.error(`Failed to process metric for stream ${streamName}`, error);
        }
    }
}

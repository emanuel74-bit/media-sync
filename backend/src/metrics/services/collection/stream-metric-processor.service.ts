import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { PodRole } from "@/common";
import { MediaMtxStreamStatsService } from "@/media-mtx";
import { SystemEventNames } from "@/system-events";

import { StreamFailoverService } from "../failover";
import { MetricPersistenceService } from "../persistence";

/**
 * Isolated per-stream metric processing responsibility.
 * Handles stats retrieval, persistence, event emission, and failover evaluation.
 */
@Injectable()
export class StreamMetricProcessor {
    private readonly logger = new Logger(StreamMetricProcessor.name);

    constructor(
        private readonly mediaMtxStats: MediaMtxStreamStatsService,
        private readonly metricPersistence: MetricPersistenceService,
        private readonly events: EventEmitter2,
        private readonly streamFailover: StreamFailoverService,
    ) {}

    async processStreamMetric(streamName: string, context: PodRole): Promise<void> {
        try {
            const stats = await this.mediaMtxStats.getStreamStats(context, streamName);
            const metric = await this.metricPersistence.saveFromStats(streamName, context, stats);

            this.events.emit(SystemEventNames.METRIC_COLLECTED, { streamName, metric });

            if (context === PodRole.CLUSTER) {
                await this.streamFailover.evaluateAndReassignIfDegraded(streamName, metric);
            }
        } catch (error) {
            this.logger.error(`Failed to process metric for stream ${streamName}`, error);
        }
    }
}

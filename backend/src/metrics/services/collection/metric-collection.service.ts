import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Cron, CronExpression } from "@nestjs/schedule";

import { MediaMtxMetricsService } from "@/infrastructure";
import { SequentialStreamTaskRunner, SystemEventNames, MetricsCollectedPayload } from "@/common";

import { MetricPersistenceService } from "../persistence";

/**
 * Periodically scrapes MediaMTX node + path operational metrics, persists them,
 * and emits `metrics.collected`. This producer does NOT evaluate rules — the
 * alerts feature reacts to the event (see ADR-0010).
 */
@Injectable()
export class MetricCollectionService {
    private readonly logger = new Logger(MetricCollectionService.name);

    constructor(
        private readonly mediaMtxMetrics: MediaMtxMetricsService,
        private readonly persistence: MetricPersistenceService,
        private readonly events: EventEmitter2,
        private readonly scheduledWork: SequentialStreamTaskRunner,
    ) {}

    @Cron(CronExpression.EVERY_10_SECONDS)
    async collectMetrics(): Promise<void> {
        await this.scheduledWork.runSafely(
            async () => {
                const snapshots = await this.mediaMtxMetrics.collect();
                const nodes = snapshots.map((snapshot) => snapshot.node);
                const paths = snapshots.flatMap((snapshot) => snapshot.paths);

                await this.persistence.saveNodeMetrics(nodes);
                await this.persistence.savePathMetrics(paths);

                const payload: MetricsCollectedPayload = {
                    nodes,
                    paths,
                    collectedAt: new Date(),
                };
                this.events.emit(SystemEventNames.METRICS_COLLECTED, payload);
            },
            (error) => this.logger.error("Metric collection cycle failed", error),
        );
    }
}

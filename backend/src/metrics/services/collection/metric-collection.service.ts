import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { MediaMtxMetricsService } from "@/media-nodes";
import { ScheduledTask, SystemEventNames, MetricsCollectedPayload } from "@/common";

import { MetricPersistenceService } from "../persistence";

/**
 * Periodically scrapes MediaMTX node + path operational metrics, persists them, and emits
 * `metrics.collected`. This producer does NOT evaluate rules — the alerts feature reacts to
 * the event (see ADR-0010). Scheduling, overlap protection, and error guarding are owned by
 * `JobScheduler`; this method just does the work.
 */
@Injectable()
export class MetricCollectionService {
    constructor(
        private readonly mediaMtxMetrics: MediaMtxMetricsService,
        private readonly persistence: MetricPersistenceService,
        private readonly events: EventEmitter2,
    ) {}

    @ScheduledTask({ name: "metrics.collect", interval: (config) => config.metricsPollInterval })
    async collectMetrics(): Promise<void> {
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
    }
}

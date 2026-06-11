import { Injectable } from "@nestjs/common";

import { PodRole } from "@/common";
import { MediaMtxStreamStatsService } from "@/infrastructure";

import { Metric } from "../../domain";
import { MetricPersistenceService } from "../persistence";

@Injectable()
export class StreamMetricCollectorService {
    constructor(
        private readonly mediaMtxStats: MediaMtxStreamStatsService,
        private readonly metricPersistence: MetricPersistenceService,
    ) {}

    async collectStreamMetric(streamName: string, context: PodRole): Promise<Metric> {
        const stats = await this.mediaMtxStats.getStreamStats(context, streamName);
        return this.metricPersistence.saveFromStats(streamName, context, stats);
    }
}

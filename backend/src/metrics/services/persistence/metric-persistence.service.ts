import { Injectable } from "@nestjs/common";

import { NodeMetricRepository, PathMetricRepository } from "../../repositories";
import { NodeMetric, PathMetric, NewNodeMetricData, NewPathMetricData } from "../../domain";

@Injectable()
export class MetricPersistenceService {
    constructor(
        private readonly nodeMetrics: NodeMetricRepository,
        private readonly pathMetrics: PathMetricRepository,
    ) {}

    async saveNodeMetrics(data: NewNodeMetricData[]): Promise<void> {
        await this.nodeMetrics.saveMany(data);
    }

    async savePathMetrics(data: NewPathMetricData[]): Promise<void> {
        await this.pathMetrics.saveMany(data);
    }

    async findRecentNodeMetrics(limit = 50): Promise<NodeMetric[]> {
        return this.nodeMetrics.findRecent(limit);
    }

    async findRecentPathMetrics(streamName: string, limit = 50): Promise<PathMetric[]> {
        return this.pathMetrics.findRecent(streamName, limit);
    }
}

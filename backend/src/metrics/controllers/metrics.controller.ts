import { ApiTags } from "@nestjs/swagger";
import { Controller, DefaultValuePipe, Get, Param, ParseIntPipe, Query } from "@nestjs/common";

import { NodeMetric, PathMetric } from "../domain";
import { MetricPersistenceService } from "../services";

@ApiTags("metrics")
@Controller("api/metrics")
export class MetricsController {
    constructor(private readonly metricPersistence: MetricPersistenceService) {}

    @Get("nodes")
    async nodeMetrics(
        @Query("limit", new DefaultValuePipe(50), ParseIntPipe) limit: number,
    ): Promise<NodeMetric[]> {
        return this.metricPersistence.findRecentNodeMetrics(limit);
    }

    @Get("stream/:name")
    async streamMetrics(
        @Param("name") name: string,
        @Query("limit", new DefaultValuePipe(50), ParseIntPipe) limit: number,
    ): Promise<PathMetric[]> {
        return this.metricPersistence.findRecentPathMetrics(name, limit);
    }
}

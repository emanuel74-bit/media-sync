import { ApiTags } from "@nestjs/swagger";
import { Controller, DefaultValuePipe, Get, Param, ParseIntPipe, Query } from "@nestjs/common";

import { Metric } from "../domain/types/metric.types";
import { MetricPersistenceService } from "../services/persistence/metric-persistence.service";

@ApiTags("metrics")
@Controller("api/metrics")
export class MetricsController {
    constructor(private readonly metricPersistence: MetricPersistenceService) {}

    @Get("stream/:name")
    async streamMetrics(
        @Param("name") name: string,
        @Query("limit", new DefaultValuePipe(50), ParseIntPipe) limit: number,
    ): Promise<Metric[]> {
        return this.metricPersistence.findRecent(name, limit);
    }
}

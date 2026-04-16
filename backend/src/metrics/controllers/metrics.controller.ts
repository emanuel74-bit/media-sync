import { ApiTags } from "@nestjs/swagger";
import { Controller, Get, Param, Query } from "@nestjs/common";

import { Metric } from "../domain";
import { MetricPersistenceService } from "../services/persistence";

@ApiTags("metrics")
@Controller("api/metrics")
export class MetricsController {
    constructor(private readonly metricPersistence: MetricPersistenceService) {}

    @Get("stream/:name")
    async streamMetrics(
        @Param("name") name: string,
        @Query("limit") limit = "50",
    ): Promise<Metric[]> {
        return this.metricPersistence.findRecent(name, Number(limit));
    }
}

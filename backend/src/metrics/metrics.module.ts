import { Module } from "@nestjs/common";

import { MediaMtxModule } from "@/infrastructure";
import { DatabaseModule } from "@/infrastructure/database";

import { MetricsController } from "./controllers";
import { MetricCollectionService, MetricPersistenceService } from "./services";

@Module({
    imports: [DatabaseModule, MediaMtxModule],
    providers: [MetricCollectionService, MetricPersistenceService],
    controllers: [MetricsController],
    exports: [MetricPersistenceService],
})
export class MetricsModule {}

import { Module } from "@nestjs/common";

import { MediaNodesModule } from "@/media-nodes";
import { DatabaseModule } from "@/infrastructure/database";

import { MetricsController } from "./controllers";
import { MetricCollectionService, MetricPersistenceService } from "./services";

@Module({
    imports: [DatabaseModule, MediaNodesModule],
    providers: [MetricCollectionService, MetricPersistenceService],
    controllers: [MetricsController],
    exports: [MetricPersistenceService],
})
export class MetricsModule {}

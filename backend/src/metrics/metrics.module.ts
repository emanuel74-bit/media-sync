import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { MediaMtxModule } from "@/infrastructure";
import {
    NodeMetric,
    PathMetric,
    NodeMetricSchema,
    PathMetricSchema,
    MongoNodeMetricRepository,
    MongoPathMetricRepository,
} from "@/infrastructure";

import { MetricsController } from "./controllers";
import { NodeMetricRepository, PathMetricRepository } from "./repositories";
import { MetricCollectionService, MetricPersistenceService } from "./services";

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: NodeMetric.name, schema: NodeMetricSchema },
            { name: PathMetric.name, schema: PathMetricSchema },
        ]),
        MediaMtxModule,
    ],
    providers: [
        MetricCollectionService,
        MetricPersistenceService,
        { provide: NodeMetricRepository, useClass: MongoNodeMetricRepository },
        { provide: PathMetricRepository, useClass: MongoPathMetricRepository },
    ],
    controllers: [MetricsController],
    exports: [MetricPersistenceService],
})
export class MetricsModule {}

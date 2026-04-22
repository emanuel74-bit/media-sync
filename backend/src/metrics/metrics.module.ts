import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { PodsModule } from "@/pods";
import { ConfigModule } from "@/config";
import { CommonModule } from "@/common";
import { StreamsModule } from "@/streams";
import { MediaMtxModule } from "@/infrastructure";
import { MongoMetricRepository, Metric, MetricSchema } from "@/infrastructure";

import { MetricRepository } from "./repositories";
import { MetricsController } from "./controllers";
import {
    StreamFailoverService,
    MetricAlertInvocationService,
    MetricPersistenceService,
    MetricCollectionService,
    StreamMetricProcessor,
} from "./services";

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Metric.name, schema: MetricSchema }]),
        MediaMtxModule,
        PodsModule,
        ConfigModule,
        StreamsModule,
        CommonModule,
    ],
    providers: [
        MetricCollectionService,
        StreamMetricProcessor,
        MetricPersistenceService,
        MetricAlertInvocationService,
        StreamFailoverService,
        { provide: MetricRepository, useClass: MongoMetricRepository },
    ],
    controllers: [MetricsController],
    exports: [MetricPersistenceService],
})
export class MetricsModule {}

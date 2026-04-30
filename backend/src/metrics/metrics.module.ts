import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { AlertsModule } from "@/alerts";
import { PodsModule } from "@/pods";
import { StreamsModule } from "@/streams";
import { MediaMtxModule } from "@/media-mtx";
import { RuntimeConfigModule } from "@/runtime-config";
import { TaskSequencingModule } from "@/task-sequencing";
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
        RuntimeConfigModule,
        StreamsModule,
        AlertsModule,
        TaskSequencingModule,
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

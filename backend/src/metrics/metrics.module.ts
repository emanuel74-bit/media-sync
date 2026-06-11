import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { AlertsModule } from "@/alerts";
import { PodsModule } from "@/pods";
import { ConfigModule } from "@/config";
import { CommonModule } from "@/common";
import { StreamsModule } from "@/streams";
import { MediaMtxModule } from "@/infrastructure";
import { MongoMetricRepository, Metric, MetricSchema } from "@/infrastructure";

import { MetricRepository } from "./repositories";
import { MetricsController } from "./controllers";
import {
    MetricAlertReactionService,
    MetricFailoverStreamGatewayService,
    MetricFailoverReactionService,
    StreamFailoverService,
    MetricAlertInvocationService,
    MetricPersistenceService,
    MetricCollectionService,
    MetricCollectionWorkflowService,
    StreamMetricCollectorService,
} from "./services";

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Metric.name, schema: MetricSchema }]),
        MediaMtxModule,
        AlertsModule,
        PodsModule,
        ConfigModule,
        StreamsModule,
        CommonModule,
    ],
    providers: [
        MetricCollectionService,
        MetricAlertReactionService,
        MetricFailoverReactionService,
        MetricCollectionWorkflowService,
        StreamMetricCollectorService,
        MetricPersistenceService,
        MetricAlertInvocationService,
        MetricFailoverStreamGatewayService,
        StreamFailoverService,
        { provide: MetricRepository, useClass: MongoMetricRepository },
    ],
    controllers: [MetricsController],
    exports: [MetricPersistenceService],
})
export class MetricsModule {}

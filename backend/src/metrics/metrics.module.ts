import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { PodsModule } from "../pods";
import { ConfigModule } from "../config";
import { StreamsModule } from "../streams";
import { CommonModule } from "../common";
import { MetricRepository } from "./repositories";
import { MetricsController } from "./controllers";
import { StreamFailoverService } from "./services/failover";
import { MediaMtxModule } from "../infrastructure/media-mtx";
import { MetricAlertInvocationService } from "./services/alerts";
import { MetricPersistenceService } from "./services/persistence";
import { MongoMetricRepository } from "../infrastructure/database/repositories";
import { MetricCollectionService, StreamMetricProcessor } from "./services/collection";
import { Metric, MetricSchema } from "../infrastructure/database/schemas/metric.schema";

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

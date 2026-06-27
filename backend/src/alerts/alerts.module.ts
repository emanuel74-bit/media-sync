import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { ConfigModule } from "@/config";
import { CommonModule } from "@/common";
import { StreamsModule } from "@/streams";
import { MongoAlertRepository, Alert, AlertSchema } from "@/infrastructure";

import { AlertRepository } from "./repositories";
import { AlertsController } from "./controllers";
import {
    AlertLifecycleService,
    AlertReconcileService,
    MetricAlertRuler,
    TrackAlertRuler,
    NodeResourceRuler,
} from "./services";

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Alert.name, schema: AlertSchema }]),
        CommonModule,
        ConfigModule,
        StreamsModule,
    ],
    providers: [
        AlertLifecycleService,
        AlertReconcileService,
        MetricAlertRuler,
        TrackAlertRuler,
        NodeResourceRuler,
        { provide: AlertRepository, useClass: MongoAlertRepository },
    ],
    controllers: [AlertsController],
})
export class AlertsModule {}

import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { ConfigModule } from "@/config";
import { StreamsModule } from "@/streams";
import { MongoAlertRepository, Alert, AlertSchema } from "@/infrastructure";

import { AlertRepository } from "./repositories";
import { AlertsController } from "./controllers";
import {
    AlertAccessService,
    AlertReconcileService,
    MetricAlertRuler,
    TrackAlertRuler,
    NodeResourceRuler,
    RuleEvaluator,
} from "./services";

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Alert.name, schema: AlertSchema }]),
        ConfigModule,
        StreamsModule,
    ],
    providers: [
        RuleEvaluator,
        AlertAccessService,
        AlertReconcileService,
        MetricAlertRuler,
        TrackAlertRuler,
        NodeResourceRuler,
        { provide: AlertRepository, useClass: MongoAlertRepository },
    ],
    controllers: [AlertsController],
})
export class AlertsModule {}

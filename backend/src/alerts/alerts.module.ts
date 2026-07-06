import { Module } from "@nestjs/common";

import { ConfigModule } from "@/config";
import { StreamsModule } from "@/streams";
import { DatabaseModule } from "@/infrastructure/database";

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
    imports: [DatabaseModule, ConfigModule, StreamsModule],
    providers: [
        RuleEvaluator,
        AlertAccessService,
        AlertReconcileService,
        MetricAlertRuler,
        TrackAlertRuler,
        NodeResourceRuler,
    ],
    controllers: [AlertsController],
})
export class AlertsModule {}

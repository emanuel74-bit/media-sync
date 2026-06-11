import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { CommonModule } from "@/common";
import { MongoAlertRepository, Alert, AlertSchema } from "@/infrastructure";

import { AlertRepository } from "./repositories";
import { AlertsController } from "./controllers";
import { AlertEvaluationService, AlertLifecycleService } from "./services";

@Module({
    imports: [MongooseModule.forFeature([{ name: Alert.name, schema: AlertSchema }]), CommonModule],
    providers: [
        AlertEvaluationService,
        AlertLifecycleService,
        { provide: AlertRepository, useClass: MongoAlertRepository },
    ],
    controllers: [AlertsController],
    exports: [AlertEvaluationService, AlertLifecycleService],
})
export class AlertsModule {}

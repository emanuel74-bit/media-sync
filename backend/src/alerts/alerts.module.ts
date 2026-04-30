import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { MongoAlertRepository, Alert, AlertSchema } from "@/infrastructure";

import { AlertRepository } from "./repositories";
import { AlertsController } from "./controllers";
import { AlertLifecycleService, AlertRuleExecutionService } from "./services";

@Module({
    imports: [MongooseModule.forFeature([{ name: Alert.name, schema: AlertSchema }])],
    providers: [
        AlertRuleExecutionService,
        AlertLifecycleService,
        { provide: AlertRepository, useClass: MongoAlertRepository },
    ],
    controllers: [AlertsController],
    exports: [AlertLifecycleService, AlertRuleExecutionService],
})
export class AlertsModule {}

import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { AlertRepository } from "./repositories";
import { AlertsController } from "./controllers";
import { AlertLifecycleService } from "./services";
import { MongoAlertRepository } from "../infrastructure/database/repositories";
import { Alert, AlertSchema } from "../infrastructure/database/schemas/alert.schema";

@Module({
    imports: [MongooseModule.forFeature([{ name: Alert.name, schema: AlertSchema }])],
    providers: [
        AlertLifecycleService,
        { provide: AlertRepository, useClass: MongoAlertRepository },
    ],
    controllers: [AlertsController],
    exports: [AlertLifecycleService],
})
export class AlertsModule {}

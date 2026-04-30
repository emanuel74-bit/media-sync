import { ApiTags } from "@nestjs/swagger";
import { Controller, Get, Patch, Param } from "@nestjs/common";

import { Alert } from "../domain/types/alert.types";
import { AlertLifecycleService } from "../services/alert-lifecycle.service";

@ApiTags("alerts")
@Controller("api/alerts")
export class AlertsController {
    constructor(private readonly alertsService: AlertLifecycleService) {}

    @Get()
    findAll(): Promise<Alert[]> {
        return this.alertsService.listAlerts();
    }

    @Patch(":id/resolve")
    resolve(@Param("id") id: string): Promise<Alert | null> {
        return this.alertsService.resolveAlert(id);
    }
}

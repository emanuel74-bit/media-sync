import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { SystemEventNames } from "@/common";

import { Alert } from "../domain";
import { AlertRepository } from "../repositories";

/**
 * Read + manual-resolve surface for alerts (backs the REST controller).
 * Automatic add/refresh/update/resolve lives in AlertReconcileService.
 */
@Injectable()
export class AlertLifecycleService {
    constructor(
        private readonly alertRepository: AlertRepository,
        private readonly events: EventEmitter2,
    ) {}

    async listAlerts(): Promise<Alert[]> {
        return this.alertRepository.findAll();
    }

    async resolveAlert(alertId: string): Promise<Alert | null> {
        const resolved = await this.alertRepository.resolveById(alertId, new Date());
        if (resolved) {
            this.events.emit(SystemEventNames.ALERT_RESOLVED, resolved);
        }
        return resolved;
    }
}

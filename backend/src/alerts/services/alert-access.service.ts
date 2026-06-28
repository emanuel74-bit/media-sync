import { Injectable } from "@nestjs/common";

import { Alert } from "../domain";
import { AlertRepository } from "../repositories";
import { AlertReconcileService } from "./alert-reconcile.service";

/**
 * Externally-triggered (REST) read + manual-resolve surface for alerts. The
 * automatic add/refresh/update/resolve lifecycle lives in AlertReconcileService,
 * which also owns the resolve transition this surface delegates to.
 */
@Injectable()
export class AlertAccessService {
    constructor(
        private readonly alertRepository: AlertRepository,
        private readonly reconcile: AlertReconcileService,
    ) {}

    async listAlerts(): Promise<Alert[]> {
        return this.alertRepository.findAll();
    }

    async resolveAlert(alertId: string): Promise<Alert | null> {
        return this.reconcile.resolve(alertId);
    }
}

import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { SystemEventNames } from "@/common";

import { AlertRepository } from "../repositories";
import { Alert, AlertCreationData } from "../domain";

@Injectable()
export class AlertLifecycleService {
    constructor(
        private readonly alertRepository: AlertRepository,
        private readonly events: EventEmitter2,
    ) {}

    async findOrCreateAlert(data: AlertCreationData): Promise<Alert> {
        const existing = await this.alertRepository.findUnresolvedByStreamAndType(
            data.streamName,
            data.type,
        );
        if (existing) {
            return existing;
        }
        const created = await this.alertRepository.create(data);
        this.events.emit(SystemEventNames.ALERT_CREATED, created);
        return created;
    }

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

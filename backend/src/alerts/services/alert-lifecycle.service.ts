import { Injectable } from "@nestjs/common";
import { EventEmitter2, OnEvent } from "@nestjs/event-emitter";

import { AlertRepository } from "../repositories";
import { Alert, AlertCreationData } from "../domain";
import { AlertCreateRequestedPayload } from "../../common";

@Injectable()
export class AlertLifecycleService {
    constructor(
        private readonly alertRepository: AlertRepository,
        private readonly events: EventEmitter2,
    ) {}

    @OnEvent("alert.create")
    async handleAlertCreateRequested(payload: AlertCreateRequestedPayload): Promise<void> {
        await this.createAlert(payload);
    }

    async createAlert(data: AlertCreationData): Promise<Alert> {
        const existing = await this.alertRepository.findUnresolvedByStreamAndType(
            data.streamName,
            data.type,
        );
        if (existing) {
            return existing;
        }
        const created = await this.alertRepository.create(data);
        this.events.emit("alert.created", created);
        return created;
    }

    async listAlerts(): Promise<Alert[]> {
        return this.alertRepository.findAll();
    }

    async resolveAlert(alertId: string): Promise<Alert | null> {
        const resolved = await this.alertRepository.resolveById(alertId, new Date());
        if (resolved) {
            this.events.emit("alert.resolved", resolved);
        }
        return resolved;
    }
}

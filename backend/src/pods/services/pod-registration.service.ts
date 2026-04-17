import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { PodRepository } from "../repositories";
import { PodStatus } from "../../common/domain";
import { Pod, PodRegistrationData } from "../domain";
import { SystemEventNames } from "../../common/events";

@Injectable()
export class PodRegistrationService {
    private readonly logger = new Logger(PodRegistrationService.name);

    constructor(
        private readonly podRepository: PodRepository,
        private readonly events: EventEmitter2,
    ) {}

    async registerPod(request: PodRegistrationData): Promise<Pod> {
        const fields: Partial<Omit<Pod, "podId" | "createdAt" | "updatedAt">> = {
            status: PodStatus.ACTIVE,
            lastHeartbeatAt: new Date(),
        };
        if (request.host !== undefined) fields.host = request.host;
        if (request.tags !== undefined) fields.tags = request.tags;
        if (request.type !== undefined) fields.type = request.type;

        const pod = await this.podRepository.upsertByPodId(request.podId, fields);
        this.logger.log(`Registered/heartbeat pod: ${request.podId}`);
        this.events.emit(SystemEventNames.POD_REGISTERED, pod);
        return pod;
    }

    async heartbeat(podId: string): Promise<Pod> {
        return this.podRepository.upsertByPodId(podId, {
            status: PodStatus.ACTIVE,
            lastHeartbeatAt: new Date(),
        });
    }
}

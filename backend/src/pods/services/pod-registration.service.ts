import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { Pod } from "../domain";
import { PodRegistrationRequest } from "../dto/pod-registration-request.dto";
import { PodRepository } from "../repositories";
import { PodStatus, SystemEventNames } from "../../common";

@Injectable()
export class PodRegistrationService {
    private readonly logger = new Logger(PodRegistrationService.name);

    constructor(
        private readonly podRepository: PodRepository,
        private readonly events: EventEmitter2,
    ) {}

    async registerPod(request: PodRegistrationRequest): Promise<Pod> {
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

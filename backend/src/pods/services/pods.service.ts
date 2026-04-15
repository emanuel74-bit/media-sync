import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { Pod } from "../domain";
import { ConfigService } from "../../config";
import { PodRepository } from "../repositories";
import { PodRole, PodStatus } from "../../common";

/** Data required to register or update a pod. */
export interface PodRegistrationRequest {
    podId: string;
    host?: string;
    tags?: string[];
    type?: PodRole;
}

export interface ActivePodRef {
    podId: string;
    host?: string;
    type?: PodRole;
}

@Injectable()
export class PodsService {
    private readonly logger = new Logger(PodsService.name);

    constructor(
        private readonly podRepository: PodRepository,
        private readonly config: ConfigService,
        private readonly events: EventEmitter2,
    ) {}

    private activeSince(): Date {
        return new Date(Date.now() - this.config.podHeartbeatToleranceSeconds * 1000);
    }

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
        this.events.emit("pod.registered", pod);
        return pod;
    }

    async heartbeat(podId: string): Promise<Pod> {
        return this.podRepository.upsertByPodId(podId, {
            status: PodStatus.ACTIVE,
            lastHeartbeatAt: new Date(),
        });
    }

    async listPods(): Promise<Pod[]> {
        return this.podRepository.findAll();
    }

    async getActivePods(): Promise<Pod[]> {
        return this.podRepository.findActive(this.activeSince());
    }

    async listActivePodRefs(role?: PodRole): Promise<ActivePodRef[]> {
        const pods = await this.podRepository.findActive(this.activeSince(), role);
        return pods.map((pod) => ({
            podId: pod.podId,
            host: pod.host ?? undefined,
            type: pod.type,
        }));
    }

    async listActivePodIds(role?: PodRole): Promise<string[]> {
        const refs = await this.listActivePodRefs(role);
        return refs.map((pod) => pod.podId);
    }

    async getActiveIngestPods(): Promise<Pod[]> {
        return this.podRepository.findActive(this.activeSince(), PodRole.INGEST);
    }

    async getActiveClusterPods(): Promise<Pod[]> {
        return this.podRepository.findActive(this.activeSince(), PodRole.CLUSTER);
    }

    async getActivePodIds(): Promise<string[]> {
        return this.listActivePodIds();
    }
}

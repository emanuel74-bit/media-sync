import { Injectable } from "@nestjs/common";

import { ConfigService } from "../../config";
import { Pod, ActivePodRef } from "../domain";
import { PodRole } from "../../common/domain";
import { PodRepository } from "../repositories";

@Injectable()
export class PodQueryService {
    constructor(
        private readonly podRepository: PodRepository,
        private readonly config: ConfigService,
    ) {}

    private activeSince(): Date {
        return new Date(Date.now() - this.config.podHeartbeatToleranceSeconds * 1000);
    }

    async listPods(): Promise<Pod[]> {
        return this.podRepository.findAll();
    }

    async getActivePods(role?: PodRole): Promise<Pod[]> {
        return this.podRepository.findActive(this.activeSince(), role);
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
}

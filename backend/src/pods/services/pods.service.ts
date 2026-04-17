/**
 * @deprecated Use PodRegistrationService or PodQueryService directly.
 * Thin facade kept for backward compatibility during migration.
 */
import { Injectable } from "@nestjs/common";

import { PodRole } from "../../common/domain";
import { PodQueryService } from "./pod-query.service";
import { Pod, ActivePodRef, PodRegistrationData } from "../domain";
import { PodRegistrationService } from "./pod-registration.service";

@Injectable()
export class PodsService {
    constructor(
        private readonly registration: PodRegistrationService,
        private readonly query: PodQueryService,
    ) {}

    async registerPod(request: PodRegistrationData): Promise<Pod> {
        return this.registration.registerPod(request);
    }

    async heartbeat(podId: string): Promise<Pod> {
        return this.registration.heartbeat(podId);
    }

    async listPods(): Promise<Pod[]> {
        return this.query.listPods();
    }

    async getActivePods(role?: PodRole): Promise<Pod[]> {
        return this.query.getActivePods(role);
    }

    async listActivePodRefs(role?: PodRole): Promise<ActivePodRef[]> {
        return this.query.listActivePodRefs(role);
    }

    async listActivePodIds(role?: PodRole): Promise<string[]> {
        return this.query.listActivePodIds(role);
    }
}

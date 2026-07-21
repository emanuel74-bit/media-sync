import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { ConfigService } from "@/config";
import { PodRole, PodStatus, SystemEventNames, NodeSampledPayload } from "@/common";

import { PodRepository } from "../../repositories";
import { Pod, NodeResources, PodHeartbeatData, PodRegistrationData } from "../../domain";

@Injectable()
export class PodLifecycleService {
    private readonly logger = new Logger(PodLifecycleService.name);

    constructor(
        private readonly podRepository: PodRepository,
        private readonly config: ConfigService,
        private readonly events: EventEmitter2,
    ) {}

    async registerPod(request: PodRegistrationData): Promise<Pod> {
        const defaultApiPort =
            request.type === PodRole.INGEST
                ? this.config.ingestPodMediaMtxPort
                : this.config.clusterPodMediaMtxPort;

        const pod = await this.podRepository.upsertByPodId(request.podId, {
            status: PodStatus.ACTIVE,
            lastHeartbeatAt: new Date(),
            host: request.host,
            type: request.type,
            apiPort: request.apiPort ?? defaultApiPort,
            rtspPort: request.rtspPort ?? this.config.mediaMtxRtspPort,
            metricsPort: request.metricsPort ?? this.config.mediaMtxMetricsPort,
        });
        this.logger.log(`Registered/heartbeat pod: ${request.podId}`);
        this.events.emit(SystemEventNames.POD_REGISTERED, pod);
        this.emitNodeSample(pod, request.resources);
        return pod;
    }

    async heartbeat(request: PodHeartbeatData): Promise<Pod> {
        const pod = await this.podRepository.upsertByPodId(request.podId, {
            status: PodStatus.ACTIVE,
            lastHeartbeatAt: new Date(),
        });
        this.emitNodeSample(pod, request.resources);
        return pod;
    }

    /** Forward self-reported host resources to the alerts pipeline (ADR-0011). */
    private emitNodeSample(pod: Pod, resources?: NodeResources): void {
        if (!resources) {
            return;
        }
        const payload: NodeSampledPayload = {
            podId: pod.podId,
            context: pod.type,
            cpu: resources.cpu,
            memory: resources.memory,
            disk: resources.disk,
        };
        this.events.emit(SystemEventNames.NODE_SAMPLED, payload);
    }
}

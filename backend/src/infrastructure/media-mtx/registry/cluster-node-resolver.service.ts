import { Inject, Injectable, Logger, forwardRef } from "@nestjs/common";

import { PodRole } from "@/common";
import { PodQueryService } from "@/pods";

import { MediaMtxClient } from "../clients";
import { MediaMtxClientRegistry } from "./media-mtx-client-registry.service";

/**
 * Resolves the live set of cluster MediaMTX clients from the pod registry.
 *
 * The statically-configured cluster URL is a single DNS name that round-robins
 * across replicas, so it cannot address a specific node. This resolver builds a
 * client per *registered* cluster pod (by host), letting the system fan out
 * across real replicas and target the pod a stream is assigned to. It falls back
 * to the static pool when no cluster pods have registered yet.
 */
@Injectable()
export class ClusterNodeResolverService {
    private readonly logger = new Logger(ClusterNodeResolverService.name);

    constructor(
        // forwardRef: this resolver is the first infrastructure code to touch the
        // @/pods barrel, so it would otherwise capture an undefined PodQueryService
        // token while the infra↔pods barrel cycle is mid-evaluation (see ADR-0008).
        @Inject(forwardRef(() => PodQueryService))
        private readonly podsService: PodQueryService,
        private readonly registry: MediaMtxClientRegistry,
    ) {}

    /** All active cluster nodes as clients; falls back to the static pool when none are registered. */
    async getActiveClusterClients(): Promise<readonly MediaMtxClient[]> {
        const pods = await this.podsService.listActivePodRefs(PodRole.CLUSTER);
        if (pods.length === 0) {
            return this.registry.getStaticClusterClients();
        }
        return this.registry.getClusterClientsFromPods(pods);
    }

    /**
     * Client for the specific pod a stream is assigned to. Falls back to a
     * round-robin static pick (with a warning) when the pod is unknown or no
     * longer active — the next sync/failover cycle will correct the assignment.
     */
    async resolveClientForPod(podId?: string | null): Promise<MediaMtxClient> {
        if (podId) {
            const pods = await this.podsService.listActivePodRefs(PodRole.CLUSTER);
            const pod = pods.find((candidate) => candidate.podId === podId);
            if (pod) {
                return this.registry.getClusterClientsFromPods([pod])[0];
            }
            this.logger.warn(
                `Assigned cluster pod '${podId}' is not active; falling back to a static cluster client`,
            );
        }
        return this.registry.pickClusterClient();
    }
}

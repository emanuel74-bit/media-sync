import { Injectable } from "@nestjs/common";

import { PodRole } from "@/common";
import { ActivePodRef, PodQueryService } from "@/pods";
import { MediaMtxClient, MediaMtxClientRegistry } from "@/infrastructure";

import { MediaMtxMetricsTarget } from "../../domain";

/** One active node and the control client to reach it. */
export interface ActiveNode {
    podId: string;
    client: MediaMtxClient;
}

/**
 * Resolves live MediaMTX node clients from the pod registry — the bridge between "which pods
 * are active" (pods feature) and "give me a transport client for this host:port" (the gateway
 * registry). Every method takes the node `role` uniformly, so ingest and cluster resolution
 * share one implementation. The live pod set is the single source of truth: no active pod
 * means no client.
 */
@Injectable()
export class NodeResolver {
    constructor(
        private readonly pods: PodQueryService,
        private readonly registry: MediaMtxClientRegistry,
    ) {}

    /** Active nodes of a role as `{ podId, client }` pairs (empty when none live). */
    async getActiveNodes(role: PodRole): Promise<ActiveNode[]> {
        const pods = await this.pods.listActivePodRefs(role);
        return pods.map((pod) => ({ podId: pod.podId, client: this.clientFor(pod, role) }));
    }

    /** Control client for a specific node of a role. Throws when that node is not live. */
    async clientForPod(role: PodRole, podId: string): Promise<MediaMtxClient> {
        const pod = await this.requirePod(role, podId);
        return this.clientFor(pod, role);
    }

    /**
     * The RTSP URL of a path on a specific ingest node — the cluster relay's pull source and a
     * publisher's push target (same endpoint). Throws when the ingest node is not live.
     */
    async getIngestRtspUrl(ingestPodId: string, pathName: string): Promise<string> {
        const pod = await this.requirePod(PodRole.INGEST, ingestPodId);
        return `rtsp://${pod.host}:${pod.rtspPort}/${pathName}`;
    }

    /** Prometheus scrape targets for one role: one per active pod (empty when none live). */
    async getMetricsTargets(role: PodRole): Promise<MediaMtxMetricsTarget[]> {
        const pods = await this.pods.listActivePodRefs(role);
        return pods.map((pod) => ({
            context: role,
            nodeId: pod.podId,
            client: this.registry.getMetricsClient(pod.host, pod.metricsPort, role),
        }));
    }

    private async requirePod(role: PodRole, podId: string): Promise<ActivePodRef> {
        const pods = await this.pods.listActivePodRefs(role);
        const pod = pods.find((ref) => ref.podId === podId);
        if (!pod) {
            throw new Error(`No active ${role} node for pod ${podId}`);
        }
        return pod;
    }

    private clientFor(pod: ActivePodRef, role: PodRole): MediaMtxClient {
        return this.registry.getClient(pod.host, pod.apiPort, role);
    }
}

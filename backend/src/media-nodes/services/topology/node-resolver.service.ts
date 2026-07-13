import { Injectable } from "@nestjs/common";

import { PodRole } from "@/common";
import { ConfigService } from "@/config";
import { PodQueryService } from "@/pods";
import { MediaMtxClient, MediaMtxMetricsClient, MediaMtxClientRegistry } from "@/infrastructure";

/** One MediaMTX node's Prometheus scrape target: which node, and the client to scrape it with. */
export interface MediaMtxMetricsTarget {
    context: PodRole;
    nodeId: string;
    client: MediaMtxMetricsClient;
}

/**
 * Resolves live MediaMTX node clients from the pod registry — the application-side
 * bridge between "which pods are active" (pods feature) and "give me a transport client
 * for this host" (the gateway registry). Lives here, not in infrastructure, because
 * deciding *which* node to talk to is domain topology, not transport (ARCH-09, ARCH-10).
 * The live pod set is the single source of truth: no active pod for a role means no
 * client, never a static fallback.
 */
@Injectable()
export class NodeResolver {
    constructor(
        private readonly pods: PodQueryService,
        private readonly registry: MediaMtxClientRegistry,
        private readonly config: ConfigService,
    ) {}

    /** The primary ingest client — the first active ingest node. Throws when none is live. */
    async getIngestClient(): Promise<MediaMtxClient> {
        const [pod] = await this.pods.listActivePodRefs(PodRole.INGEST);
        if (!pod) {
            throw new Error("No active ingest node");
        }
        return this.registry.getClient(pod.host, PodRole.INGEST);
    }

    /** All active ingest nodes as clients (per-pod discovery fallback). */
    async getActiveIngestClients(): Promise<readonly MediaMtxClient[]> {
        const pods = await this.pods.listActivePodRefs(PodRole.INGEST);
        return pods.map((pod) => this.registry.getClient(pod.host, PodRole.INGEST));
    }

    /** All active cluster nodes as clients. Empty when none are live. */
    async getActiveClusterClients(): Promise<readonly MediaMtxClient[]> {
        const pods = await this.pods.listActivePodRefs(PodRole.CLUSTER);
        return pods.map((pod) => this.registry.getClient(pod.host, PodRole.CLUSTER));
    }

    /** Client for the specific pod a stream is assigned to. Throws when that pod is not live. */
    async getClusterClientForPod(podId: string): Promise<MediaMtxClient> {
        const pods = await this.pods.listActivePodRefs(PodRole.CLUSTER);
        const pod = pods.find((ref) => ref.podId === podId);
        if (!pod) {
            throw new Error(`No active cluster node for pod ${podId}`);
        }
        return this.registry.getClient(pod.host, PodRole.CLUSTER);
    }

    /** Prometheus scrape targets for one role: one per active pod (empty when none live). */
    async getMetricsTargets(role: PodRole): Promise<MediaMtxMetricsTarget[]> {
        const pods = await this.pods.listActivePodRefs(role);
        return pods.map((pod) => ({
            context: role,
            nodeId: pod.podId,
            client: this.registry.getMetricsClient(pod.host, role),
        }));
    }

    /**
     * The URL a cluster node pulls a path from the ingest over RTSP. This targets the
     * **stable ingest relay endpoint** (a Service/DNS in front of the ingest, media plane),
     * not a specific ingest pod — so it comes from config, not the pod registry. Control-
     * plane addressing (per-node HTTP ops) is pod-derived; a stable shared media endpoint
     * is deployment config, like a database URL (ARCH-11).
     */
    getIngestPullUrl(pathName: string): string {
        return `${this.config.ingestRtspBaseUrl}/${pathName}`;
    }
}

import { Injectable } from "@nestjs/common";

import { PodRole } from "@/common";
import { ConfigService } from "@/config";

import { MediaMtxClient } from "../clients";
import { MediaMtxPodEndpoint } from "../types";
import { MediaMtxClientFactory } from "./media-mtx-client.factory";

/**
 * Owns and vends MediaMTX HTTP client instances.
 * Builds the primary ingest client and the statically-configured cluster pool,
 * and builds per-pod clients from registered node endpoints.
 * Pure topology/transport: no knowledge of streams, pipelines, or which pod owns what —
 * live-topology resolution lives in ClusterNodeResolverService.
 */
@Injectable()
export class MediaMtxClientRegistry {
    private readonly ingestClient: MediaMtxClient;
    private readonly staticClusterClients: MediaMtxClient[];
    private clusterRoundRobinIndex = 0;

    constructor(
        private readonly config: ConfigService,
        private readonly factory: MediaMtxClientFactory,
    ) {
        this.ingestClient = this.factory.getOrCreate(this.config.ingestBaseUrl);
        this.staticClusterClients = this.config.clusterBaseUrls.map((url: string) =>
            this.factory.getOrCreate(url),
        );
    }

    getIngestClient(): MediaMtxClient {
        return this.ingestClient;
    }

    getClientForRole(role: PodRole): MediaMtxClient {
        return role === PodRole.INGEST ? this.getIngestClient() : this.pickClusterClient();
    }

    /** Round-robin over the statically-configured cluster pool (fallback / stats path). */
    pickClusterClient(): MediaMtxClient {
        if (!this.staticClusterClients.length) {
            throw new Error("No cluster MediaMTX endpoints configured");
        }
        const client = this.staticClusterClients[this.clusterRoundRobinIndex];
        this.clusterRoundRobinIndex =
            (this.clusterRoundRobinIndex + 1) % this.staticClusterClients.length;
        return client;
    }

    /** The statically-configured cluster pool; used as a fallback when no pods are registered. */
    getStaticClusterClients(): readonly MediaMtxClient[] {
        return this.staticClusterClients;
    }

    getIngestClientsFromPods(pods: readonly MediaMtxPodEndpoint[]): readonly MediaMtxClient[] {
        return this.buildClientsFromPods(
            pods,
            this.config.ingestPodMediaMtxPort,
            this.credentialsFrom(this.config.ingestBaseUrl),
        );
    }

    getClusterClientsFromPods(pods: readonly MediaMtxPodEndpoint[]): readonly MediaMtxClient[] {
        return this.buildClientsFromPods(
            pods,
            this.config.clusterPodMediaMtxPort,
            this.credentialsFrom(this.config.clusterBaseUrl),
        );
    }

    private buildClientsFromPods(
        pods: readonly MediaMtxPodEndpoint[],
        port: number,
        auth: string,
    ): readonly MediaMtxClient[] {
        return pods.map((pod) =>
            this.factory.getOrCreate(`http://${auth}${pod.host || pod.podId}:${port}`),
        );
    }

    /**
     * Extract `user:pass@` from a configured base URL so pod-derived clients carry
     * the same API credentials (registered pods report only host/IP, not auth).
     */
    private credentialsFrom(baseUrl: string): string {
        try {
            const url = new URL(baseUrl);
            return url.username ? `${url.username}:${url.password}@` : "";
        } catch {
            return "";
        }
    }
}

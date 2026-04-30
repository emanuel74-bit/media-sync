import { Injectable } from "@nestjs/common";

import { PodRole } from "@/common";
import { RuntimeConfigService } from "@/runtime-config";

import { MediaMtxClient } from "../clients";
import { IngestPodEndpoint } from "../types";

import { MediaMtxClientFactory } from "./media-mtx-client-factory.service";

/**
 * Owns and vends MediaMTX HTTP client instances.
 * Responsible for building the ingest client and the cluster client pool,
 * and for round-robin selection across cluster nodes.
 * Has no knowledge of streams, pipelines, or business logic.
 */
@Injectable()
export class MediaMtxClientRegistry {
    private readonly ingestClient: MediaMtxClient;
    private readonly clusterClients: MediaMtxClient[];
    private clusterRoundRobinIndex = 0;

    constructor(
        private readonly config: RuntimeConfigService,
        private readonly factory: MediaMtxClientFactory,
    ) {
        this.ingestClient = this.factory.getOrCreate(this.config.ingestBaseUrl);
        this.clusterClients = this.config.clusterBaseUrls.map((url: string) =>
            this.factory.getOrCreate(url),
        );
    }

    getIngestClient(): MediaMtxClient {
        return this.ingestClient;
    }

    getClientForRole(role: PodRole): MediaMtxClient {
        return role === PodRole.INGEST ? this.getIngestClient() : this.pickClusterClient();
    }

    pickClusterClient(): MediaMtxClient {
        if (!this.clusterClients.length) {
            throw new Error("No cluster MediaMTX endpoints configured");
        }
        const client = this.clusterClients[this.clusterRoundRobinIndex];
        this.clusterRoundRobinIndex =
            (this.clusterRoundRobinIndex + 1) % this.clusterClients.length;
        return client;
    }

    getClusterClients(): readonly MediaMtxClient[] {
        return this.clusterClients;
    }

    getIngestClientsFromPods(pods: readonly IngestPodEndpoint[]): readonly MediaMtxClient[] {
        return pods.map((pod) => {
            const host = pod.host || pod.podId;
            return this.factory.getOrCreate(`http://${host}:${this.config.ingestPodMediaMtxPort}`);
        });
    }
}

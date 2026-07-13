import { Injectable } from "@nestjs/common";

import { PodRole } from "@/common";
import { ConfigService } from "@/config";

import { authPrefix, buildNodeUrl } from "../mappers";
import { MediaMtxClient, MediaMtxMetricsClient } from "../clients";
import { MediaMtxClientFactory, MediaMtxMetricsClientFactory } from "./factories";

/**
 * Vends MediaMTX HTTP client instances (control + metrics) for a given node host.
 * Pure transport: it turns a host into a cached client using per-deployment transport
 * config (port + credentials) and nothing else — no knowledge of streams, pipelines, or
 * which pods are live. Callers (the `media-nodes` feature) resolve *which* hosts to talk
 * to from the pod registry and hand them in one at a time (ARCH-09/ARCH-10). There is no
 * static address fallback: an empty live-pod set means no clients, decided upstream.
 */
@Injectable()
export class MediaMtxClientRegistry {
    constructor(
        private readonly config: ConfigService,
        private readonly factory: MediaMtxClientFactory,
        private readonly metricsFactory: MediaMtxMetricsClientFactory,
    ) {}

    /** Control-API client for a node host in the given role. */
    getClient(host: string, role: PodRole): MediaMtxClient {
        return this.factory.getOrCreate(
            buildNodeUrl(this.authFor(role), host, this.controlPort(role)),
        );
    }

    /** Prometheus metrics client for a node host in the given role. */
    getMetricsClient(host: string, role: PodRole): MediaMtxMetricsClient {
        return this.metricsFactory.getOrCreate(
            buildNodeUrl(this.authFor(role), host, this.config.mediaMtxMetricsPort),
        );
    }

    private authFor(role: PodRole): string {
        return authPrefix(
            role === PodRole.INGEST ? this.config.ingestNodeAuth : this.config.clusterNodeAuth,
        );
    }

    private controlPort(role: PodRole): number {
        return role === PodRole.INGEST
            ? this.config.ingestPodMediaMtxPort
            : this.config.clusterPodMediaMtxPort;
    }
}

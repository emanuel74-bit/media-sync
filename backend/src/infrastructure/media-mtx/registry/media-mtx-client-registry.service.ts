import { Injectable } from "@nestjs/common";

import { PodRole } from "@/common";
import { ConfigService } from "@/config";

import { authPrefix, buildNodeUrl } from "../mappers";
import { MediaMtxClient, MediaMtxMetricsClient } from "../clients";
import { MediaMtxClientFactory, MediaMtxMetricsClientFactory } from "./factories";

/**
 * Vends MediaMTX HTTP client instances (control + metrics) for a given node host + port.
 * Pure transport: it turns a host:port into a cached client, attaching the role's
 * credentials, and nothing else — no knowledge of streams, pipelines, or which pods are
 * live, and it no longer owns node ports (several nodes per VM share a host and differ by
 * port, so the port belongs to the pod). Callers (the `media-nodes` feature) resolve
 * *which* host:port to talk to from the pod registry and hand them in (ARCH-09/ARCH-10).
 * Role is used only to pick credentials. There is no static address fallback.
 */
@Injectable()
export class MediaMtxClientRegistry {
    constructor(
        private readonly config: ConfigService,
        private readonly factory: MediaMtxClientFactory,
        private readonly metricsFactory: MediaMtxMetricsClientFactory,
    ) {}

    /** Control-API client for a node at host:port, authenticated for the given role. */
    getClient(host: string, port: number, role: PodRole): MediaMtxClient {
        return this.factory.getOrCreate(buildNodeUrl(this.authFor(role), host, port));
    }

    /** Prometheus metrics client for a node at host:port, authenticated for the given role. */
    getMetricsClient(host: string, port: number, role: PodRole): MediaMtxMetricsClient {
        return this.metricsFactory.getOrCreate(buildNodeUrl(this.authFor(role), host, port));
    }

    private authFor(role: PodRole): string {
        return authPrefix(
            role === PodRole.INGEST ? this.config.ingestNodeAuth : this.config.clusterNodeAuth,
        );
    }
}

import { Inject, Injectable, Logger, forwardRef } from "@nestjs/common";

import { PodRole } from "@/common";
import { PodQueryService } from "@/pods";

import { MediaMtxStreamInfo } from "../../../types";
import { MediaMtxClientRegistry } from "../../../registry";
import { StreamCollectionService } from "../stream-collection.service";

/**
 * Strategy for listing ingest streams with primary/fallback logic.
 * Attempts primary ingest endpoint; falls back to pod-based discovery on failure.
 */
@Injectable()
export class IngestStreamListingStrategy {
    private readonly logger = new Logger(IngestStreamListingStrategy.name);

    constructor(
        private readonly registry: MediaMtxClientRegistry,
        // forwardRef: infra consumers of PodQueryService capture an undefined token
        // if they decorate while the infra↔pods barrel cycle is mid-evaluation (ADR-0008).
        @Inject(forwardRef(() => PodQueryService))
        private readonly podsService: PodQueryService,
        private readonly streamCollection: StreamCollectionService,
    ) {}

    /**
     * List ingest streams via primary endpoint or fallback to pod discovery.
     */
    async listIngestStreams(): Promise<MediaMtxStreamInfo[]> {
        try {
            return await this.registry.getIngestClient().listPaths();
        } catch (error) {
            this.logger.warn(
                "Primary ingest endpoint failed, falling back to pod discovery",
                error,
            );
        }
        return this.listIngestStreamsFromPods();
    }

    /**
     * List ingest streams by fan-out across all ingest pods.
     */
    private async listIngestStreamsFromPods(): Promise<MediaMtxStreamInfo[]> {
        const ingestPods = await this.podsService.listActivePodRefs(PodRole.INGEST);
        const clients = this.registry.getIngestClientsFromPods(ingestPods);
        return this.streamCollection.collectFromClients(clients);
    }
}

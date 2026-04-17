import { Injectable, Logger } from "@nestjs/common";

import { MediaMtxStreamInfo } from "../types";
import { PodRole } from "../../../common/domain";
import { MediaMtxClientRegistry } from "../registry";
import { PodQueryService } from "../../../pods/services";
import { collectStreamsFromClients } from "./stream-collection.util";

/**
 * Strategy for listing ingest streams with primary/fallback logic.
 * Attempts primary ingest endpoint; falls back to pod-based discovery on failure.
 */
@Injectable()
export class IngestStreamListingStrategy {
    private readonly logger = new Logger(IngestStreamListingStrategy.name);

    constructor(
        private readonly registry: MediaMtxClientRegistry,
        private readonly podsService: PodQueryService,
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
        return collectStreamsFromClients(clients);
    }
}

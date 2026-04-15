import { Injectable, Logger } from "@nestjs/common";

import { PodRole } from "../../../common";
import { MediaMtxClient } from "../clients";
import { MediaMtxStreamInfo } from "../types";
import { PodsService } from "../../../pods/services";
import { MediaMtxClientRegistry } from "../registry";

/**
 * Strategy for listing ingest streams with primary/fallback logic.
 * Attempts primary ingest endpoint; falls back to pod-based discovery on failure.
 */
@Injectable()
export class IngestStreamListingStrategy {
    private readonly logger = new Logger(IngestStreamListingStrategy.name);

    constructor(
        private readonly registry: MediaMtxClientRegistry,
        private readonly podsService: PodsService,
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
        return this.collectStreamsFromClients(clients);
    }

    /**
     * Aggregate streams from multiple clients with per-client error isolation.
     */
    private async collectStreamsFromClients(
        clients: readonly MediaMtxClient[],
    ): Promise<MediaMtxStreamInfo[]> {
        if (clients.length === 0) {
            return [];
        }

        const allStreams: MediaMtxStreamInfo[] = [];

        for (const client of clients) {
            const streams = await this.listStreamsFromClient(client);
            allStreams.push(...streams);
        }

        return allStreams;
    }

    /**
     * List streams from a single client with error handling.
     */
    private async listStreamsFromClient(client: MediaMtxClient): Promise<MediaMtxStreamInfo[]> {
        try {
            return await client.listPaths();
        } catch (error) {
            this.logger.warn("Failed to list streams from an ingest pod", error);
            return [];
        }
    }
}

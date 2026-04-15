import { Injectable, Logger } from "@nestjs/common";

import { MediaMtxClient } from "../clients";
import { MediaMtxStreamInfo } from "../types";
import { MediaMtxClientRegistry } from "../registry";

/**
 * Strategy for listing cluster streams.
 * Aggregates streams from all cluster nodes with per-node error isolation.
 */
@Injectable()
export class ClusterStreamListingStrategy {
    private readonly logger = new Logger(ClusterStreamListingStrategy.name);

    constructor(private readonly registry: MediaMtxClientRegistry) {}

    /**
     * List cluster streams by fan-out across all cluster nodes.
     */
    async listClusterStreams(): Promise<MediaMtxStreamInfo[]> {
        const clients = this.registry.getClusterClients();
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
            this.logger.warn("Failed to list streams from a cluster node", error);
            return [];
        }
    }
}

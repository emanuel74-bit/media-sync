import { Injectable, Logger } from "@nestjs/common";

import { StreamDetails, MediaMtxClient } from "@/infrastructure";

import { NodeResolver } from "../topology";

/**
 * Fetches track-level details for individual streams (used by stream inspection).
 * The ingest node and cluster nodes are distinct targets, so each has its own method:
 * an ingest stream lives on the single ingest node; a cluster stream lives on exactly
 * the node it was assigned to, so the caller must supply that pod id — a round-robin
 * pick would hit the wrong node and 404.
 */
@Injectable()
export class MediaMtxStreamStatsService {
    private readonly logger = new Logger(MediaMtxStreamStatsService.name);

    constructor(private readonly nodes: NodeResolver) {}

    async getIngestStreamDetails(name: string): Promise<StreamDetails> {
        return this.fetch(name, "ingest", await this.nodes.getIngestClient());
    }

    async getClusterStreamDetails(name: string, assignedPodId: string): Promise<StreamDetails> {
        return this.fetch(name, "cluster", await this.nodes.getClusterClientForPod(assignedPodId));
    }

    private async fetch(
        name: string,
        source: string,
        client: MediaMtxClient,
    ): Promise<StreamDetails> {
        try {
            return await client.getStreamDetails(name);
        } catch (error) {
            this.logger.warn(`Failed to get stream details for ${name} on ${source}`, error);
            throw error;
        }
    }
}

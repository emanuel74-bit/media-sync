import { Injectable, Logger } from "@nestjs/common";

import { NodeRole } from "@/common";
import { StreamDetails } from "@/infrastructure";

import { NodeResolver } from "../topology";

/**
 * Fetches track-level details for an individual stream (used by stream inspection). A stream
 * lives on exactly one node — the ingest node it was published on, or the cluster node it was
 * assigned to — so the caller supplies that role + node id; a pick over the pool would 404
 * against a sibling.
 */
@Injectable()
export class MediaMtxStreamStatsService {
    private readonly logger = new Logger(MediaMtxStreamStatsService.name);

    constructor(private readonly nodes: NodeResolver) {}

    async getStreamDetails(role: NodeRole, name: string, nodeId: string): Promise<StreamDetails> {
        const client = await this.nodes.clientForNode(role, nodeId);
        try {
            return await client.getStreamDetails(name);
        } catch (error) {
            this.logger.warn(`Failed to get stream details for ${name} on ${role}`, error);
            throw error;
        }
    }
}

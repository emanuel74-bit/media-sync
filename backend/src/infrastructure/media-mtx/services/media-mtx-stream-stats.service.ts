import { Injectable, Logger } from "@nestjs/common";

import { PodRole } from "../../../common";
import { StreamStats, V3PathItem } from "../types";
import { MediaMtxClientRegistry } from "../registry";

/**
 * Fetches runtime statistics and track-level details for individual streams.
 * Selects the appropriate MediaMTX node based on the stream's role (ingest vs cluster).
 */
@Injectable()
export class MediaMtxStreamStatsService {
    private readonly logger = new Logger(MediaMtxStreamStatsService.name);

    constructor(private readonly registry: MediaMtxClientRegistry) {}

    async getStreamStats(context: PodRole, streamName: string): Promise<StreamStats> {
        const client = this.registry.getClientForRole(context);
        try {
            return (await client.getPathItem(streamName)) as unknown as StreamStats;
        } catch (error) {
            this.logger.warn(`Failed to get stream stats for ${streamName} on ${context}`, error);
            throw error;
        }
    }

    async getStreamDetails(name: string, source: PodRole): Promise<V3PathItem> {
        const client = this.registry.getClientForRole(source);
        try {
            return await client.getPathItem(name);
        } catch (error) {
            this.logger.warn(`Failed to get stream details for ${name} on ${source}`, error);
            throw error;
        }
    }
}

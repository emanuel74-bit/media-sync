import { Injectable, Logger } from "@nestjs/common";

import { PodRole } from "@/common";

import { StreamDetails } from "../../types";
import { MediaMtxClientRegistry } from "../../registry";
import { mapV3PathToStreamDetails } from "../../mappers";

/**
 * Fetches track-level details for individual streams (used by stream inspection).
 * Selects the appropriate MediaMTX node based on the stream's role (ingest vs cluster).
 */
@Injectable()
export class MediaMtxStreamStatsService {
    private readonly logger = new Logger(MediaMtxStreamStatsService.name);

    constructor(private readonly registry: MediaMtxClientRegistry) {}

    async getStreamDetails(name: string, source: PodRole): Promise<StreamDetails> {
        const client = this.registry.getClientForRole(source);
        try {
            const pathItem = await client.getPathItem(name);
            return mapV3PathToStreamDetails(name, pathItem);
        } catch (error) {
            this.logger.warn(`Failed to get stream details for ${name} on ${source}`, error);
            throw error;
        }
    }
}

import { Injectable, Logger } from "@nestjs/common";

import { MediaMtxClient } from "../../clients";
import { MediaMtxStreamInfo } from "../../types";

/**
 * Fans out stream listing across a set of MediaMTX clients.
 * Isolates per-client failures so a single unreachable node does not
 * prevent collection from healthy nodes.
 */
@Injectable()
export class StreamCollectionService {
    private readonly logger = new Logger(StreamCollectionService.name);

    async collectFromClients(clients: readonly MediaMtxClient[]): Promise<MediaMtxStreamInfo[]> {
        if (clients.length === 0) {
            return [];
        }

        const allStreams: MediaMtxStreamInfo[] = [];

        for (const client of clients) {
            const streams = await this.listFromClient(client);
            allStreams.push(...streams);
        }

        return allStreams;
    }

    private async listFromClient(client: MediaMtxClient): Promise<MediaMtxStreamInfo[]> {
        try {
            return await client.listPaths();
        } catch (error) {
            this.logger.warn(`Failed to list paths from client: ${error instanceof Error ? error.message : String(error)}`);
            return [];
        }
    }
}

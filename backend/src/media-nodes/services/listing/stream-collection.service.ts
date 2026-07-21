import { Injectable, Logger } from "@nestjs/common";

import { PodRole } from "@/common";
import { MediaMtxClient, MediaMtxStreamInfo } from "@/infrastructure";

import { ContextualMediaMtxStream } from "../../domain";

/** Fans out stream listing across MediaMTX clients, isolating per-node failures. */
@Injectable()
export class StreamCollectionService {
    private readonly logger = new Logger(StreamCollectionService.name);

    async collectFromClients(clients: readonly MediaMtxClient[]): Promise<MediaMtxStreamInfo[]> {
        const collected: MediaMtxStreamInfo[] = [];
        for (const client of clients) {
            const streams = await this.listFromClient(client);
            collected.push(...streams);
        }
        return collected;
    }

    /** Like {@link collectFromClients}, but tags every stream with its role and owning node. */
    async collectFromNodes(
        nodes: readonly { podId: string; client: MediaMtxClient }[],
        context: PodRole,
    ): Promise<ContextualMediaMtxStream[]> {
        const tagged: ContextualMediaMtxStream[] = [];
        for (const { podId, client } of nodes) {
            const streams = await this.collectFromClients([client]);
            const contextual = streams.map((stream) => ({ stream, context, nodeId: podId }));
            tagged.push(...contextual);
        }
        return tagged;
    }

    private async listFromClient(client: MediaMtxClient): Promise<MediaMtxStreamInfo[]> {
        try {
            return await client.listPaths();
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.warn(`Failed to list paths from client: ${message}`);
            return [];
        }
    }
}

import { Injectable, Logger } from "@nestjs/common";

import { NodeRole } from "@/common";
import { MediaMtxClient, MediaMtxStreamInfo } from "@/infrastructure";

import { MediaMtxStreamListingResult } from "../../domain";

/** Fans out stream listing across MediaMTX clients, isolating per-node failures. */
@Injectable()
export class StreamCollectionService {
    private readonly logger = new Logger(StreamCollectionService.name);

    async collectFromClients(clients: readonly MediaMtxClient[]): Promise<MediaMtxStreamInfo[]> {
        const collected: MediaMtxStreamInfo[] = [];
        for (const client of clients) {
            const streams = await this.listFromClient(client);
            if (streams) {
                collected.push(...streams);
            }
        }
        return collected;
    }

    /**
     * Tags streams with their owning node and reports which active nodes answered successfully.
     * A caller can therefore distinguish an authoritative empty list from a failed scrape.
     */
    async collectFromNodes(
        nodes: readonly { nodeId: string; client: MediaMtxClient }[],
        context: NodeRole,
    ): Promise<MediaMtxStreamListingResult> {
        const streams: MediaMtxStreamListingResult["streams"] = [];
        const observedNodeIds: string[] = [];
        for (const { nodeId, client } of nodes) {
            const nodeStreams = await this.listFromClient(client, nodeId);
            if (!nodeStreams) {
                continue;
            }
            observedNodeIds.push(nodeId);
            const contextual = nodeStreams.map((stream) => ({ stream, context, nodeId }));
            streams.push(...contextual);
        }
        return {
            streams,
            nodeIds: nodes.map(({ nodeId }) => nodeId),
            observedNodeIds,
        };
    }

    private async listFromClient(
        client: MediaMtxClient,
        nodeId?: string,
    ): Promise<MediaMtxStreamInfo[] | null> {
        try {
            return await client.listPaths();
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            const subject = nodeId ? `node ${nodeId}` : "client";
            this.logger.warn(`Failed to list paths from ${subject}: ${message}`);
            return null;
        }
    }
}

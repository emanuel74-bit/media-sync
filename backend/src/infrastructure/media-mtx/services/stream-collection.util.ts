import { Logger } from "@nestjs/common";

import { MediaMtxClient } from "../clients";
import { MediaMtxStreamInfo } from "../types";

const logger = new Logger("StreamCollector");

export async function collectStreamsFromClients(
    clients: readonly MediaMtxClient[],
): Promise<MediaMtxStreamInfo[]> {
    if (clients.length === 0) {
        return [];
    }

    const allStreams: MediaMtxStreamInfo[] = [];

    for (const client of clients) {
        const streams = await listStreamsFromClient(client);
        allStreams.push(...streams);
    }

    return allStreams;
}

async function listStreamsFromClient(client: MediaMtxClient): Promise<MediaMtxStreamInfo[]> {
    try {
        return await client.listPaths();
    } catch (error) {
        logger.warn("Failed to list streams from a node", error);
        return [];
    }
}

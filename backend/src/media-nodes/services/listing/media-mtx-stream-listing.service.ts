import { Injectable, Logger } from "@nestjs/common";

import { PodRole } from "@/common";
import { MediaMtxStreamInfo } from "@/infrastructure";

import { NodeResolver } from "../topology";
import { ContextualMediaMtxStream } from "../../domain";
import { StreamCollectionService } from "./stream-collection.service";

/**
 * Discovers which streams are active across ingest and cluster nodes. Ingest listing
 * tries the primary endpoint and degrades to per-pod fan-out on failure; cluster
 * listing fans out across the live cluster nodes. Node resolution is owned by
 * `NodeResolver`; per-node failure isolation by `StreamCollectionService`.
 */
@Injectable()
export class MediaMtxStreamListingService {
    private readonly logger = new Logger(MediaMtxStreamListingService.name);

    constructor(
        private readonly nodes: NodeResolver,
        private readonly streamCollection: StreamCollectionService,
    ) {}

    /** List ingest streams via the primary endpoint, falling back to per-pod discovery. */
    async listIngestStreams(): Promise<MediaMtxStreamInfo[]> {
        try {
            const client = await this.nodes.getIngestClient();
            return await client.listPaths();
        } catch (error) {
            this.logger.warn(
                "Primary ingest endpoint failed, falling back to pod discovery",
                error,
            );
        }
        const clients = await this.nodes.getActiveIngestClients();
        return this.streamCollection.collectFromClients(clients);
    }

    /** List cluster streams by fan-out across all active cluster nodes. */
    async listClusterStreams(): Promise<MediaMtxStreamInfo[]> {
        const clients = await this.nodes.getActiveClusterClients();
        return this.streamCollection.collectFromClients(clients);
    }

    async listContextualStreams(): Promise<ContextualMediaMtxStream[]> {
        const [ingestStreams, clusterStreams] = await Promise.all([
            this.listIngestStreams(),
            this.listClusterStreams(),
        ]);

        return [
            ...this.withContext(ingestStreams, PodRole.INGEST),
            ...this.withContext(clusterStreams, PodRole.CLUSTER),
        ];
    }

    private withContext(
        streams: readonly MediaMtxStreamInfo[],
        context: PodRole,
    ): ContextualMediaMtxStream[] {
        return streams.map((stream) => ({ stream, context }));
    }
}

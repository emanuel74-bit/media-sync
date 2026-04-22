import { Injectable, Logger } from "@nestjs/common";

import { PodRole } from "@/common";
import { MediaMtxStreamInfo, ContextualMediaMtxStream } from "@/infrastructure";

import { IngestStreamListingStrategy } from "./ingest";
import { ClusterStreamListingStrategy } from "./cluster";

/**
 * Discovers which streams are active across ingest and cluster nodes.
 * Delegates listing strategies for ingest (with fallback) and cluster (fan-out).
 */
@Injectable()
export class MediaMtxStreamListingService {
    private readonly logger = new Logger(MediaMtxStreamListingService.name);

    constructor(
        private readonly ingestStrategy: IngestStreamListingStrategy,
        private readonly clusterStrategy: ClusterStreamListingStrategy,
    ) {}

    async listClusterStreams(): Promise<MediaMtxStreamInfo[]> {
        return this.clusterStrategy.listClusterStreams();
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

    async listIngestStreams(): Promise<MediaMtxStreamInfo[]> {
        return this.ingestStrategy.listIngestStreams();
    }

    private withContext(
        streams: readonly MediaMtxStreamInfo[],
        context: PodRole,
    ): ContextualMediaMtxStream[] {
        return streams.map((stream) => ({ stream, context }));
    }
}

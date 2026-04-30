import { Injectable } from "@nestjs/common";

import { PodRole } from "@/common";

import { ContextualMediaMtxStream, MediaMtxStreamInfo } from "../types";

import { IngestStreamListingStrategy } from "./ingest-stream-listing.strategy";
import { ClusterStreamListingStrategy } from "./cluster-stream-listing.strategy";

@Injectable()
export class MediaMtxStreamListingService {
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

import { Injectable, Logger } from "@nestjs/common";

import { PodRole } from "@/common";
import { PodQueryService } from "@/pods";
import { MediaMtxClientRegistry, StreamCollectionService } from "@/infrastructure";

import { MediaMtxStreamInfo } from "../types";

@Injectable()
export class IngestStreamListingStrategy {
    private readonly logger = new Logger(IngestStreamListingStrategy.name);

    constructor(
        private readonly registry: MediaMtxClientRegistry,
        private readonly podsService: PodQueryService,
        private readonly streamCollection: StreamCollectionService,
    ) {}

    async listIngestStreams(): Promise<MediaMtxStreamInfo[]> {
        try {
            return await this.registry.getIngestClient().listPaths();
        } catch (error) {
            this.logger.warn(
                "Primary ingest endpoint failed, falling back to pod discovery",
                error,
            );
        }

        const ingestPods = await this.podsService.listActivePodRefs(PodRole.INGEST);
        const clients = this.registry.getIngestClientsFromPods(ingestPods);
        return this.streamCollection.collectFromClients(clients);
    }
}
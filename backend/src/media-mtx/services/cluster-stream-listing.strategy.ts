import { Injectable } from "@nestjs/common";

import { MediaMtxClientRegistry, StreamCollectionService } from "@/infrastructure";

import { MediaMtxStreamInfo } from "../types";

@Injectable()
export class ClusterStreamListingStrategy {
    constructor(
        private readonly registry: MediaMtxClientRegistry,
        private readonly streamCollection: StreamCollectionService,
    ) {}

    async listClusterStreams(): Promise<MediaMtxStreamInfo[]> {
        const clients = this.registry.getClusterClients();
        return this.streamCollection.collectFromClients(clients);
    }
}
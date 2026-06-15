import { Injectable, Logger } from "@nestjs/common";

import { MediaMtxStreamInfo } from "../../../types";
import { ClusterNodeResolverService } from "../../../registry";
import { StreamCollectionService } from "../stream-collection.service";

/**
 * Strategy for listing cluster streams.
 * Fans out across the live set of registered cluster nodes (resolver),
 * with per-node error isolation.
 */
@Injectable()
export class ClusterStreamListingStrategy {
    private readonly logger = new Logger(ClusterStreamListingStrategy.name);

    constructor(
        private readonly clusterNodes: ClusterNodeResolverService,
        private readonly streamCollection: StreamCollectionService,
    ) {}

    /**
     * List cluster streams by fan-out across all active cluster nodes.
     */
    async listClusterStreams(): Promise<MediaMtxStreamInfo[]> {
        const clients = await this.clusterNodes.getActiveClusterClients();
        return this.streamCollection.collectFromClients(clients);
    }
}

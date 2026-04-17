import { Injectable, Logger } from "@nestjs/common";

import { MediaMtxStreamInfo } from "../types";
import { MediaMtxClientRegistry } from "../registry";
import { collectStreamsFromClients } from "./stream-collection.util";

/**
 * Strategy for listing cluster streams.
 * Aggregates streams from all cluster nodes with per-node error isolation.
 */
@Injectable()
export class ClusterStreamListingStrategy {
    private readonly logger = new Logger(ClusterStreamListingStrategy.name);

    constructor(private readonly registry: MediaMtxClientRegistry) {}

    /**
     * List cluster streams by fan-out across all cluster nodes.
     */
    async listClusterStreams(): Promise<MediaMtxStreamInfo[]> {
        const clients = this.registry.getClusterClients();
        return collectStreamsFromClients(clients);
    }
}

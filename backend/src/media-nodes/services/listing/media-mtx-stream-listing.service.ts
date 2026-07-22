import { Injectable } from "@nestjs/common";

import { NodeRole } from "@/common";

import { NodeResolver } from "../topology";
import { ContextualMediaMtxStream } from "../../domain";
import { StreamCollectionService } from "./stream-collection.service";

/**
 * Discovers which streams are active on the nodes of a role, each tagged with its role and
 * owning node (`nodeId`) so a per-node-addressed relay can pull from that specific node. One
 * role-parameterized path serves ingest and cluster alike. Node resolution is owned by
 * `NodeResolver`; per-node failure isolation by `StreamCollectionService`.
 */
@Injectable()
export class MediaMtxStreamListingService {
    constructor(
        private readonly nodes: NodeResolver,
        private readonly streamCollection: StreamCollectionService,
    ) {}

    /** Active streams on the nodes of a role, each tagged with its owning node. */
    async listStreams(role: NodeRole): Promise<ContextualMediaMtxStream[]> {
        const nodes = await this.nodes.getActiveNodes(role);
        return this.streamCollection.collectFromNodes(nodes, role);
    }

    /** Every active stream, ingest and cluster, tagged with its role. */
    async listContextualStreams(): Promise<ContextualMediaMtxStream[]> {
        const [ingestStreams, clusterStreams] = await Promise.all([
            this.listStreams(NodeRole.INGEST),
            this.listStreams(NodeRole.CLUSTER),
        ]);
        return [...ingestStreams, ...clusterStreams];
    }
}

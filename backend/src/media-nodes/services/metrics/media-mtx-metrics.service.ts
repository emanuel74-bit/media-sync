import { Injectable, Logger } from "@nestjs/common";

import { NodeRole } from "@/common";
import { NodeQueryService } from "@/nodes";
import { MediaMtxMetricsSnapshot } from "@/infrastructure";

import { NodeResolver } from "../topology";
import { MediaMtxMetricsTarget, NodeLoad } from "../../domain";

/**
 * Scrapes the Prometheus /metrics endpoint of every live MediaMTX node (ingest + cluster)
 * and returns a per-node operational snapshot. Topology — which nodes are live and the
 * client to reach each — is resolved by `NodeResolver`; per-node failures are isolated.
 * No live nodes for a role means no targets for it.
 */
@Injectable()
export class MediaMtxMetricsService {
    private readonly logger = new Logger(MediaMtxMetricsService.name);

    constructor(
        private readonly nodes: NodeResolver,
        private readonly nodeQuery: NodeQueryService,
    ) {}

    /**
     * Live publish load per active node of a role: the paths each currently serves. Every active
     * node is reported (a node with no scrape or no paths reports `0`), so the full candidate set
     * is always visible to placement.
     */
    async getNodeLoads(role: NodeRole): Promise<NodeLoad[]> {
        const [nodeIds, snapshots] = await Promise.all([
            this.nodeQuery.listActiveNodeIds(role),
            this.collect(),
        ]);

        const liveLoad = new Map<string, number>();
        for (const { node } of snapshots) {
            if (node.context === role) {
                liveLoad.set(node.node, node.paths);
            }
        }

        return nodeIds.map((nodeId) => ({ nodeId, load: liveLoad.get(nodeId) ?? 0 }));
    }

    async collect(): Promise<MediaMtxMetricsSnapshot[]> {
        const [ingestTargets, clusterTargets] = await Promise.all([
            this.nodes.getMetricsTargets(NodeRole.INGEST),
            this.nodes.getMetricsTargets(NodeRole.CLUSTER),
        ]);
        const targets = [...ingestTargets, ...clusterTargets];

        const snapshots: MediaMtxMetricsSnapshot[] = [];
        for (const target of targets) {
            const snapshot = await this.scrape(target);
            if (snapshot) {
                snapshots.push(snapshot);
            }
        }
        return snapshots;
    }

    private async scrape(target: MediaMtxMetricsTarget): Promise<MediaMtxMetricsSnapshot | null> {
        try {
            return await target.client.fetchSnapshot(target.context, target.nodeId);
        } catch (error) {
            this.logger.warn(
                `Failed to scrape metrics from ${target.context} node ${target.nodeId}: ${
                    error instanceof Error ? error.message : String(error)
                }`,
            );
            return null;
        }
    }
}

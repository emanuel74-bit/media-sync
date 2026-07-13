import { Injectable, Logger } from "@nestjs/common";

import { PodRole } from "@/common";
import { MediaMtxMetricsSnapshot } from "@/infrastructure";

import { NodeResolver, MediaMtxMetricsTarget } from "../topology";

/**
 * Scrapes the Prometheus /metrics endpoint of every live MediaMTX node (ingest + cluster)
 * and returns a per-node operational snapshot. Topology — which nodes are live and the
 * client to reach each — is resolved by `NodeResolver`; per-node failures are isolated.
 * No live pods for a role means no targets for it.
 */
@Injectable()
export class MediaMtxMetricsService {
    private readonly logger = new Logger(MediaMtxMetricsService.name);

    constructor(private readonly nodes: NodeResolver) {}

    async collect(): Promise<MediaMtxMetricsSnapshot[]> {
        const [ingestTargets, clusterTargets] = await Promise.all([
            this.nodes.getMetricsTargets(PodRole.INGEST),
            this.nodes.getMetricsTargets(PodRole.CLUSTER),
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

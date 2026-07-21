import { Injectable } from "@nestjs/common";

import { NodeRole } from "@/common";
import { ActiveNodeRef, NodeQueryService } from "@/nodes";
import { MediaMtxClient, MediaMtxClientRegistry } from "@/infrastructure";

import { MediaMtxMetricsTarget } from "../../domain";

/** One active node and the control client to reach it. */
export interface ActiveNode {
    nodeId: string;
    client: MediaMtxClient;
}

/**
 * Resolves live MediaMTX node clients from the node registry — the bridge between "which nodes
 * are active" (nodes feature) and "give me a transport client for this host:port" (the gateway
 * registry). Every method takes the node `role` uniformly, so ingest and cluster resolution
 * share one implementation. The live node set is the single source of truth: no active node
 * means no client.
 */
@Injectable()
export class NodeResolver {
    constructor(
        private readonly nodes: NodeQueryService,
        private readonly registry: MediaMtxClientRegistry,
    ) {}

    /** Active nodes of a role as `{ nodeId, client }` pairs (empty when none live). */
    async getActiveNodes(role: NodeRole): Promise<ActiveNode[]> {
        const nodes = await this.nodes.listActiveNodeRefs(role);
        return nodes.map((node) => ({ nodeId: node.nodeId, client: this.clientFor(node, role) }));
    }

    /** Control client for a specific node of a role. Throws when that node is not live. */
    async clientForNode(role: NodeRole, nodeId: string): Promise<MediaMtxClient> {
        const node = await this.requireNode(role, nodeId);
        return this.clientFor(node, role);
    }

    /**
     * The RTSP URL of a path on a specific ingest node — the cluster relay's pull source and a
     * publisher's push target (same endpoint). Throws when the ingest node is not live.
     */
    async getIngestRtspUrl(ingestNodeId: string, pathName: string): Promise<string> {
        const node = await this.requireNode(NodeRole.INGEST, ingestNodeId);
        return `rtsp://${node.host}:${node.rtspPort}/${pathName}`;
    }

    /** Prometheus scrape targets for one role: one per active node (empty when none live). */
    async getMetricsTargets(role: NodeRole): Promise<MediaMtxMetricsTarget[]> {
        const nodes = await this.nodes.listActiveNodeRefs(role);
        return nodes.map((node) => ({
            context: role,
            nodeId: node.nodeId,
            client: this.registry.getMetricsClient(node.host, node.metricsPort, role),
        }));
    }

    private async requireNode(role: NodeRole, nodeId: string): Promise<ActiveNodeRef> {
        const nodes = await this.nodes.listActiveNodeRefs(role);
        const node = nodes.find((ref) => ref.nodeId === nodeId);
        if (!node) {
            throw new Error(`No active ${role} node for node ${nodeId}`);
        }
        return node;
    }

    private clientFor(node: ActiveNodeRef, role: NodeRole): MediaMtxClient {
        return this.registry.getClient(node.host, node.apiPort, role);
    }
}

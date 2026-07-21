import { isAxiosError } from "axios";
import { Injectable, Logger } from "@nestjs/common";

import { NodeRole } from "@/common";
import { MediaMtxClient, PipelineCreateResult } from "@/infrastructure";

import { NodeResolver } from "../topology";

/**
 * Cluster pipeline CRUD — create and delete pull pipelines on cluster MediaMTX nodes. A pipeline
 * is created on the node a stream is assigned to and pulls from a caller-resolved source URL;
 * deletes fan out across all active nodes since the owning node is not tracked.
 */
@Injectable()
export class MediaMtxPipelineService {
    private readonly logger = new Logger(MediaMtxPipelineService.name);

    constructor(private readonly nodes: NodeResolver) {}

    async buildClusterPullPipeline(
        streamName: string,
        assignedNodeId: string,
        pullSource: string,
    ): Promise<PipelineCreateResult> {
        try {
            const client = await this.nodes.clientForNode(NodeRole.CLUSTER, assignedNodeId);
            const result = await client.addPath(streamName, pullSource);
            if (result.alreadyExists) {
                this.logger.debug(`Cluster pull pipeline already exists for ${streamName}`);
            }
            return result;
        } catch (error) {
            if (isAxiosError(error) && error.response?.status === 409) {
                this.logger.debug(`Cluster pull pipeline already exists for ${streamName}`);
                return { alreadyExists: true };
            }
            this.logger.error(`Failed to build cluster pull pipeline for ${streamName}`, error);
            throw error;
        }
    }

    async teardownClusterPullPipeline(streamName: string): Promise<void> {
        const nodes = await this.nodes.getActiveNodes(NodeRole.CLUSTER);
        for (const { client } of nodes) {
            await this.removePathFromClusterClient(client, streamName);
        }
    }

    private async removePathFromClusterClient(
        client: MediaMtxClient,
        streamName: string,
    ): Promise<void> {
        try {
            await client.removePath(streamName);
        } catch (error) {
            // 404 = the path isn't on this node (expected: only the assigned node
            // hosts it, but delete fans out across all of them).
            if (isAxiosError(error) && error.response?.status === 404) {
                return;
            }
            this.logger.warn(`Failed to delete cluster pipeline ${streamName}`, error);
        }
    }
}

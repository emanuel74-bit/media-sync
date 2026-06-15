import { isAxiosError } from "axios";
import { Injectable, Logger } from "@nestjs/common";

import { ConfigService } from "@/config";

import { MediaMtxClient } from "../../clients";
import { ClusterNodeResolverService } from "../../registry";
import { PipelineCreateResult, MediaMtxStreamInfo } from "../../types";

/** Protocols a cluster node can pull a stream from directly. */
const PULLABLE_SOURCE = /^(rtsps?|rtmps?|srt|https?|udp):\/\//i;

/**
 * Cluster pipeline CRUD — create and delete pull pipelines on cluster MediaMTX nodes.
 * Pipelines are created on the node a stream is assigned to; deletes fan out across
 * all active nodes since the owning node is not tracked.
 */
@Injectable()
export class MediaMtxPipelineService {
    private readonly logger = new Logger(MediaMtxPipelineService.name);

    constructor(
        private readonly clusterNodes: ClusterNodeResolverService,
        private readonly config: ConfigService,
    ) {}

    async createClusterPullPipeline(
        stream: MediaMtxStreamInfo,
        targetPodId?: string | null,
    ): Promise<PipelineCreateResult> {
        const source = this.resolvePullSource(stream);
        try {
            const client = await this.clusterNodes.resolveClientForPod(targetPodId);
            const result = await client.addPath(stream.name, source);
            if (result.alreadyExists) {
                this.logger.debug(`Cluster pull pipeline already exists for ${stream.name}`);
            }
            return result;
        } catch (error) {
            if (isAxiosError(error) && error.response?.status === 409) {
                this.logger.debug(`Cluster pull pipeline already exists for ${stream.name}`);
                return { alreadyExists: true };
            }
            this.logger.error(`Failed to create cluster pull pipeline for ${stream.name}`, error);
            throw error;
        }
    }

    async deleteClusterPipeline(streamName: string): Promise<void> {
        const clients = await this.clusterNodes.getActiveClusterClients();
        for (const client of clients) {
            await this.removePathFromClusterClient(client, streamName);
        }
    }

    /**
     * The URL a cluster node pulls from. A stream whose stored source is already a
     * pullable protocol URL (e.g. a manual external source) is used directly;
     * otherwise the cluster pulls the path from the ingest node over RTSP. The v3
     * reported source (e.g. "rtspSession") is a description, never a pull URL.
     */
    private resolvePullSource(stream: MediaMtxStreamInfo): string {
        if (stream.source && PULLABLE_SOURCE.test(stream.source)) {
            return stream.source;
        }
        return `${this.config.ingestRtspBaseUrl}/${stream.name}`;
    }

    private async removePathFromClusterClient(
        client: MediaMtxClient,
        streamName: string,
    ): Promise<void> {
        try {
            await client.removePath(streamName);
        } catch (error) {
            // 404 = the path isn't on this node (expected: only the assigned pod
            // hosts it, but delete fans out across all of them).
            if (isAxiosError(error) && error.response?.status === 404) {
                return;
            }
            this.logger.warn(`Failed to delete cluster pipeline ${streamName}`, error);
        }
    }
}

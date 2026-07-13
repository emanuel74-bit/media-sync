import { isAxiosError } from "axios";
import { Injectable, Logger } from "@nestjs/common";

import { ConfigService } from "@/config";
import { buildProtocolPattern } from "@/common";
import { MediaMtxClient, PipelineCreateResult, MediaMtxStreamInfo } from "@/infrastructure";

import { NodeResolver } from "../topology";

/**ster pipeline CRUD — creat
 * Clue and delete pull pipelines on cluster MediaMTX nodes.
 * A pipeline is created on the node a stream is assigned to (resolved from the assigned
 * pod id); deletes fan out across all active nodes since the owning node is not tracked.
 */
@Injectable()
export class MediaMtxPipelineService {
    private readonly logger = new Logger(MediaMtxPipelineService.name);

    /** Protocols a cluster node can pull directly — compiled once from config (CFG-driven). */
    private readonly pullableSource: RegExp;

    constructor(
        private readonly nodes: NodeResolver,
        config: ConfigService,
    ) {
        this.pullableSource = buildProtocolPattern(config.pullableSourceProtocols);
    }

    async buildClusterPullPipeline(
        stream: MediaMtxStreamInfo,
        assignedPodId: string,
    ): Promise<PipelineCreateResult> {
        const source = this.resolvePullSource(stream);
        try {
            const client = await this.nodes.getClusterClientForPod(assignedPodId);
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
            this.logger.error(`Failed to build cluster pull pipeline for ${stream.name}`, error);
            throw error;
        }
    }

    async teardownClusterPullPipeline(streamName: string): Promise<void> {
        const clients = await this.nodes.getActiveClusterClients();
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
        if (stream.source && this.pullableSource.test(stream.source)) {
            return stream.source;
        }
        return this.nodes.getIngestPullUrl(stream.name);
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

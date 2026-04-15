import { Injectable, Logger } from "@nestjs/common";

import { MediaMtxClient } from "../clients";
import { ConfigService } from "../../../config";
import { MediaMtxClientRegistry } from "../registry";
import { PipelineCreateResult, MediaMtxStreamInfo } from "../types";

/**
 * Cluster pipeline CRUD — create and delete pull pipelines on cluster MediaMTX nodes.
 */
@Injectable()
export class MediaMtxPipelineService {
    private readonly logger = new Logger(MediaMtxPipelineService.name);

    constructor(
        private readonly registry: MediaMtxClientRegistry,
        private readonly config: ConfigService,
    ) {}

    async createClusterPullPipeline(stream: MediaMtxStreamInfo): Promise<PipelineCreateResult> {
        const fallbackUri = `rtsp://${this.config.ingestBaseUrl.replace(/^https?:\/\//, "")}/${stream.name}`;
        const uri = stream.source && stream.source !== "unknown" ? stream.source : fallbackUri;
        try {
            const client = this.registry.pickClusterClient();
            const result = await client.addPath(stream.name, uri);
            if (result.alreadyExists) {
                this.logger.debug(`Cluster pull pipeline already exists for ${stream.name}`);
            }
            return result;
        } catch (error) {
            this.logger.error(`Failed to create cluster pull pipeline for ${stream.name}`, error);
            throw error;
        }
    }

    async deleteClusterPipeline(streamName: string): Promise<void> {
        for (const client of this.registry.getClusterClients()) {
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
            this.logger.warn(`Failed to delete cluster pipeline ${streamName}`, error);
        }
    }
}

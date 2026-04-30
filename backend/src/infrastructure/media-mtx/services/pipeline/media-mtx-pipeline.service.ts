import { isAxiosError } from "axios";
import { Injectable, Logger } from "@nestjs/common";

import { RuntimeConfigService } from "@/runtime-config";

import { MediaMtxClient } from "../../clients";
import { MediaMtxClientRegistry } from "../../registry";
import { MediaMtxStreamInfo, PipelineCreateResult } from "../../types";

/**
 * Cluster pipeline CRUD — create and delete pull pipelines on cluster MediaMTX nodes.
 */
@Injectable()
export class MediaMtxPipelineService {
    private readonly logger = new Logger(MediaMtxPipelineService.name);

    constructor(
        private readonly registry: MediaMtxClientRegistry,
        private readonly config: RuntimeConfigService,
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
            if (isAxiosError(error) && error.response?.status === 409) {
                this.logger.debug(`Cluster pull pipeline already exists for ${stream.name}`);
                return { alreadyExists: true };
            }
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

import { Injectable, Logger } from "@nestjs/common";

import { Stream, StreamsFacadeService } from "@/streams";

import { SyncContext } from "../../domain";

@Injectable()
export class StreamStalenessService {
    private readonly logger = new Logger(StreamStalenessService.name);

    constructor(private readonly streams: StreamsFacadeService) {}

    async execute(context: SyncContext): Promise<void> {
        const staleStreams = context.allStreams.filter(
            (stream) => !stream.isManual && !context.ingestNames.has(stream.name),
        );
        for (const stream of staleStreams) {
            await this.removeStale(stream, context.clusterNames);
        }
    }

    private async removeStale(stream: Stream, clusterNames: Set<string>): Promise<void> {
        try {
            await this.streams.markStale(stream.name);

            if (clusterNames.has(stream.name)) {
                await this.streams.teardownClusterPipeline(stream);
            }
        } catch (error) {
            this.logger.warn(`Failed to remove stale stream ${stream.name}`, error);
        }
    }
}

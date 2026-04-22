import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { Stream } from "@/streams";
import { SystemEventNames } from "@/common";
import { StreamStatusService } from "@/streams";
import { SyncContext, SyncWorkflow } from "@/sync";
import { MediaMtxPipelineService } from "@/infrastructure";

@Injectable()
export class StreamStalenessService implements SyncWorkflow {
    readonly name = "StreamStaleness";
    private readonly logger = new Logger(StreamStalenessService.name);

    constructor(
        private readonly mediaMtxPipeline: MediaMtxPipelineService,
        private readonly streamStatus: StreamStatusService,
        private readonly events: EventEmitter2,
    ) {}

    async removeStale(
        allStreams: Stream[],
        ingestNames: Set<string>,
        clusterNames: Set<string>,
    ): Promise<void> {
        const staleStreams = allStreams.filter(
            (stream) => !stream.isManual && !ingestNames.has(stream.name),
        );
        for (const stream of staleStreams) {
            await this.markStale(stream, clusterNames);
        }
    }

    async markStale(stream: Stream, clusterNames: Set<string>): Promise<void> {
        try {
            await this.streamStatus.markStale(stream.name);

            if (clusterNames.has(stream.name)) {
                await this.mediaMtxPipeline.deleteClusterPipeline(stream.name);
                this.events.emit(SystemEventNames.STREAM_REMOVED, stream.name);
            }
        } catch (error) {
            this.logger.warn(`Failed to remove stale stream ${stream.name}`, error);
        }
    }

    async execute(context: SyncContext): Promise<void> {
        await this.removeStale(context.allStreams, context.ingestNames, context.clusterNames);
    }
}

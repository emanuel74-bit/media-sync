import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { SystemEventNames } from "@/common";
import { MediaMtxPipelineService } from "@/infrastructure";

import { Stream } from "../../domain";
import { StreamStatusService } from "../mutation";

@Injectable()
export class StreamPipelineService {
    private readonly logger = new Logger(StreamPipelineService.name);

    constructor(
        private readonly streamStatus: StreamStatusService,
        private readonly mediaMtxService: MediaMtxPipelineService,
        private readonly events: EventEmitter2,
    ) {}

    /** Build the cluster pull pipeline for a stream on its assigned pod (no status side effects). */
    async build(stream: Stream): Promise<void> {
        await this.mediaMtxService.createClusterPullPipeline(
            {
                name: stream.name,
                source: stream.source,
                status: stream.status,
            },
            stream.assignedPod,
        );
    }

    /** Deploy the full streaming pipeline: build it, mark the stream SYNCED, and announce it. */
    async deploy(stream: Stream): Promise<Stream> {
        try {
            await this.build(stream);
            const synced = await this.streamStatus.markSynced(stream.name);
            this.events.emit(SystemEventNames.STREAM_SYNCED, synced);
            return synced;
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to sync stream";
            this.logger.error(`Failed to deploy cluster pipeline for ${stream.name}: ${message}`);
            return this.streamStatus.markSyncError(stream.name, message);
        }
    }
}

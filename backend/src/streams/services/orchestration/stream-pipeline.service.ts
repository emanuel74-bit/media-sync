import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { SystemEventNames } from "@/common";
import { MediaMtxPipelineService, NodeResolver } from "@/media-nodes";

import { Stream } from "../../domain";
import { StreamStatusService } from "../mutation";

@Injectable()
export class StreamPipelineService {
    private readonly logger = new Logger(StreamPipelineService.name);

    constructor(
        private readonly streamStatus: StreamStatusService,
        private readonly mediaMtxService: MediaMtxPipelineService,
        private readonly nodes: NodeResolver,
        private readonly events: EventEmitter2,
    ) {}

    /** Build the cluster pull pipeline for a stream on its assigned node (no status side effects). */
    async build(stream: Stream): Promise<void> {
        if (!stream.assignedNode) {
            throw new Error(`Cannot build cluster pipeline for unassigned stream ${stream.name}`);
        }

        // An ingest-origin stream is pulled from its ingest node; any other stream (a manual
        // one) already stores a directly pullable source.
        const pullSource = stream.ingestNode
            ? await this.nodes.getIngestRtspUrl(stream.ingestNode, stream.name)
            : stream.source;

        await this.mediaMtxService.buildClusterPullPipeline(
            stream.name,
            stream.assignedNode,
            pullSource,
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

    /** Tear down a stream's cluster pipeline and announce its removal. */
    async teardown(stream: Stream): Promise<void> {
        await this.mediaMtxService.teardownClusterPullPipeline(stream.name);
        this.events.emit(SystemEventNames.STREAM_REMOVED, stream.name);
    }
}

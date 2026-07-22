import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { StreamsFacadeService } from "@/streams";
import { ScheduledTask, NodeRole, SystemEventNames } from "@/common";
import { StreamDetails, MediaMtxStreamInfo } from "@/infrastructure";
import { MediaMtxStreamStatsService, MediaMtxStreamListingService } from "@/media-nodes";

import { NewStreamInspectionData } from "../../domain";
import { StreamInspectionRepository } from "../../repositories";

/**
 * Periodically inspects every contextual stream and records the result, emitting
 * `stream.inspected` per stream (the alerts feature reacts — see ADR-0010). Cadence is
 * `INSPECTION_INTERVAL`; whole-cycle and overlap guarding are owned by `JobScheduler`. A
 * per-stream failure is isolated here so one bad stream never aborts the rest of the sweep.
 */
@Injectable()
export class StreamInspectionCollectionService {
    private readonly logger = new Logger(StreamInspectionCollectionService.name);

    constructor(
        private readonly streamInspectionRepository: StreamInspectionRepository,
        private readonly mediaMtxStats: MediaMtxStreamStatsService,
        private readonly mediaMtxListing: MediaMtxStreamListingService,
        private readonly streams: StreamsFacadeService,
        private readonly events: EventEmitter2,
    ) {}

    @ScheduledTask({
        name: "stream-inspection.inspect",
        interval: (config) => config.inspectionInterval,
    })
    async inspectAllStreams(): Promise<void> {
        const [streams, allStreams] = await Promise.all([
            this.mediaMtxListing.listContextualStreams(),
            this.streams.findAll(),
        ]);
        const assignedNodeByName = new Map(
            allStreams.map((stream) => [stream.name, stream.assignedNode]),
        );

        for (const { stream, context: source, nodeId } of streams) {
            // A stream lives on exactly one node: the cluster node it was assigned to, or the
            // ingest node it was discovered on (`nodeId`). Pass that node id so stats target the
            // right node instead of 404ing against a sibling.
            const targetNodeId =
                source === NodeRole.CLUSTER ? assignedNodeByName.get(stream.name) : nodeId;
            try {
                await this.inspectAndRecord(stream, source, targetNodeId);
            } catch (error) {
                this.logger.error(`Failed to record inspection for stream ${stream.name}`, error);
            }
        }
    }

    async inspectAndRecord(
        stream: MediaMtxStreamInfo,
        source: NodeRole,
        nodeId?: string | null,
    ): Promise<void> {
        const inspectedAt = new Date();
        const { details, lastError } = await this.inspectStream(stream, source, nodeId);

        const record: NewStreamInspectionData = {
            streamName: stream.name,
            source,
            tracks: details?.tracks ?? [],
            metadata: details ? { ...details.metadata } : {},
            lastError,
            inspectedAt,
        };
        await this.streamInspectionRepository.save(record);

        if (details) {
            this.logger.debug(`Inspected stream ${stream.name}: ${record.tracks.length} tracks`);
        }

        this.events.emit(SystemEventNames.STREAM_INSPECTED, record);
    }

    /** Inspect one stream, turning a failure into `lastError` data rather than a throw. */
    private async inspectStream(
        stream: MediaMtxStreamInfo,
        source: NodeRole,
        nodeId?: string | null,
    ): Promise<{ details: StreamDetails | null; lastError: string | null }> {
        try {
            const details = await this.fetchDetails(stream.name, source, nodeId);
            return { details, lastError: null };
        } catch (error) {
            this.logger.error(`Failed to inspect stream ${stream.name}`, error);
            return {
                details: null,
                lastError: error instanceof Error ? error.message : String(error),
            };
        }
    }

    private async fetchDetails(
        name: string,
        source: NodeRole,
        nodeId?: string | null,
    ): Promise<StreamDetails> {
        if (!nodeId) {
            throw new Error(`${source} stream ${name} has no known node`);
        }
        return this.mediaMtxStats.getStreamDetails(source, name, nodeId);
    }
}

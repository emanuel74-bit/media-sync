import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { StreamsFacadeService } from "@/streams";
import { ScheduledTask, PodRole, SystemEventNames } from "@/common";
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
        const assignedPodByName = new Map(
            allStreams.map((stream) => [stream.name, stream.assignedPod]),
        );

        for (const { stream, context: source } of streams) {
            // A cluster stream lives only on its assigned pod; pass that pod id so stats
            // targets the right node instead of 404ing against a sibling replica.
            const assignedPodId =
                source === PodRole.CLUSTER ? assignedPodByName.get(stream.name) : undefined;
            try {
                await this.inspectAndRecord(stream, source, assignedPodId);
            } catch (error) {
                this.logger.error(`Failed to record inspection for stream ${stream.name}`, error);
            }
        }
    }

    async inspectAndRecord(
        stream: MediaMtxStreamInfo,
        source: PodRole,
        assignedPodId?: string | null,
    ): Promise<void> {
        const inspectedAt = new Date();
        const { details, lastError } = await this.inspectStream(stream, source, assignedPodId);

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
        source: PodRole,
        assignedPodId?: string | null,
    ): Promise<{ details: StreamDetails | null; lastError: string | null }> {
        try {
            const details = await this.fetchDetails(stream.name, source, assignedPodId);
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
        source: PodRole,
        assignedPodId?: string | null,
    ): Promise<StreamDetails> {
        if (source === PodRole.INGEST) {
            return this.mediaMtxStats.getIngestStreamDetails(name);
        }
        if (!assignedPodId) {
            throw new Error(`Cluster stream ${name} has no assigned pod`);
        }
        return this.mediaMtxStats.getClusterStreamDetails(name, assignedPodId);
    }
}

import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { ScheduledTask, PodRole, SystemEventNames } from "@/common";
import {
    MediaMtxStreamStatsService,
    MediaMtxStreamListingService,
    MediaMtxStreamInfo,
    StreamDetails,
} from "@/infrastructure";

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
        private readonly events: EventEmitter2,
    ) {}

    @ScheduledTask({
        name: "stream-inspection.inspect",
        interval: (config) => config.inspectionInterval,
    })
    async inspectAllStreams(): Promise<void> {
        const streams = await this.mediaMtxListing.listContextualStreams();
        for (const { stream, context: source } of streams) {
            try {
                await this.inspectAndRecord(stream, source);
            } catch (error) {
                this.logger.error(`Failed to record inspection for stream ${stream.name}`, error);
            }
        }
    }

    async inspectAndRecord(stream: MediaMtxStreamInfo, source: PodRole): Promise<void> {
        const inspectedAt = new Date();
        const { details, lastError } = await this.inspectStream(stream, source);

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
    ): Promise<{ details: StreamDetails | null; lastError: string | null }> {
        try {
            const details = await this.mediaMtxStats.getStreamDetails(stream.name, source);
            return { details, lastError: null };
        } catch (error) {
            this.logger.error(`Failed to inspect stream ${stream.name}`, error);
            return {
                details: null,
                lastError: error instanceof Error ? error.message : String(error),
            };
        }
    }
}

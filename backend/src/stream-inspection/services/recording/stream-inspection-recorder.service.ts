import { EventEmitter2 } from "@nestjs/event-emitter";
import { Inject, Injectable, Logger, forwardRef } from "@nestjs/common";

import { PodRole } from "@/common";
import { SystemEventNames } from "@/common";
import { MediaMtxStreamStatsService } from "@/infrastructure";
import { MediaMtxStreamInfo, StreamDetails } from "@/infrastructure";

import { NewStreamInspectionData } from "../../domain";
import { StreamInspectionRepository } from "../../repositories";

@Injectable()
export class StreamInspectionRecorderService {
    private readonly logger = new Logger(StreamInspectionRecorderService.name);

    constructor(
        @Inject(forwardRef(() => StreamInspectionRepository))
        private readonly streamInspectionRepository: StreamInspectionRepository,
        private readonly mediaMtxStats: MediaMtxStreamStatsService,
        private readonly events: EventEmitter2,
    ) {}

    async inspectAndRecord(stream: MediaMtxStreamInfo, source: PodRole): Promise<void> {
        const inspectedAt = new Date();
        let details: StreamDetails | null = null;
        let lastError: string | null = null;

        try {
            details = await this.mediaMtxStats.getStreamDetails(stream.name, source);
        } catch (error) {
            lastError = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to inspect stream ${stream.name}`, error);
        }

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
}

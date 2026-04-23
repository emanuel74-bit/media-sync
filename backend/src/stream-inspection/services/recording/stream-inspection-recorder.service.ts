import { EventEmitter2 } from "@nestjs/event-emitter";
import { Inject, Injectable, Logger, forwardRef } from "@nestjs/common";

import { PodRole } from "@/common";
import { SystemEventNames } from "@/common";
import { MediaMtxStreamInfo } from "@/infrastructure";
import { MediaMtxStreamStatsService } from "@/infrastructure";
import { StreamInspectionRepository } from "@/stream-inspection";

import { StreamInspectionRecordFactory } from "./stream-inspection-record.factory";

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
        let details = null;
        let lastError: string | null = null;

        try {
            details = await this.mediaMtxStats.getStreamDetails(stream.name, source);
        } catch (error) {
            lastError = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to inspect stream ${stream.name}`, error);
        }

        const record = StreamInspectionRecordFactory.build(
            stream.name,
            source,
            details,
            lastError,
            new Date(),
        );
        await this.streamInspectionRepository.save(record);

        if (details) {
            this.logger.debug(`Inspected stream ${stream.name}: ${record.tracks.length} tracks`);
        }

        this.events.emit(SystemEventNames.STREAM_INSPECTED, record);
    }
}

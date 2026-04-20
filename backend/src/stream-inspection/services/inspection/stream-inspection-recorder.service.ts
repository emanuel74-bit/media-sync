import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { PodRole } from "../../../common/domain";
import { SystemEventNames } from "../../../common/events";
import { StreamInspectionRepository } from "../../repositories";
import { buildInspectionRecord } from "./build-inspection-record.util";
import { MediaMtxStreamStatsService } from "../../../infrastructure/media-mtx/services";
import { MediaMtxStreamInfo } from "../../../infrastructure/media-mtx/types";

@Injectable()
export class StreamInspectionRecorderService {
    private readonly logger = new Logger(StreamInspectionRecorderService.name);

    constructor(
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

        const record = buildInspectionRecord(stream.name, source, details, lastError);
        await this.streamInspectionRepository.save(record);

        if (details) {
            this.logger.debug(`Inspected stream ${stream.name}: ${record.tracks.length} tracks`);
        }

        this.events.emit(SystemEventNames.STREAM_INSPECTED, record);
    }
}

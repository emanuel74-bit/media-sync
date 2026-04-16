import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { parseTracksFromPathItem } from "../parsing";
import { NewStreamInspectionData } from "../../domain";
import { StreamInspectionRepository } from "../../repositories";
import { PodRole } from "../../../common/domain";
import { SystemEventNames } from "../../../common/events";
import { MediaMtxStreamInfo, V3PathItem } from "../../../infrastructure/media-mtx/types";
import { MediaMtxStreamStatsService } from "../../../infrastructure/media-mtx/services";

@Injectable()
export class StreamInspectionRecorderService {
    private readonly logger = new Logger(StreamInspectionRecorderService.name);

    constructor(
        private readonly streamInspectionRepository: StreamInspectionRepository,
        private readonly mediaMtxStats: MediaMtxStreamStatsService,
        private readonly events: EventEmitter2,
    ) {}

    async inspectAndRecord(stream: MediaMtxStreamInfo, source: PodRole): Promise<void> {
        let details: V3PathItem | null = null;
        let lastError: string | null = null;

        try {
            details = await this.mediaMtxStats.getStreamDetails(stream.name, source);
        } catch (error) {
            lastError = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to inspect stream ${stream.name}`, error);
        }

        // Save happens exactly once regardless of fetch outcome; save errors propagate to caller.
        await this.recordInspection(stream.name, source, details, lastError);
    }

    private async recordInspection(
        streamName: string,
        source: PodRole,
        details: V3PathItem | null,
        lastError: string | null,
    ): Promise<void> {
        const tracks = details ? parseTracksFromPathItem(details) : [];
        const record: NewStreamInspectionData = {
            streamName,
            source,
            tracks,
            metadata: details
                ? {
                      bytesReceived: details.bytesReceived,
                      bytesSent: details.bytesSent,
                      readers: details.readers,
                  }
                : {},
            lastError,
            inspectedAt: new Date(),
        };
        await this.streamInspectionRepository.save(record);

        if (details) {
            this.logger.debug(`Inspected stream ${streamName}: ${tracks.length} tracks`);
        }

        this.events.emit(SystemEventNames.STREAM_INSPECTED, record);
    }
}

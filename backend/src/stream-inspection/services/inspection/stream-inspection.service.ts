import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Cron, CronExpression } from "@nestjs/schedule";

import { parseTracksFromPathItem } from "../parsing";
import { StreamInspectionRecord } from "../../domain";
import { NewStreamInspectionData, StreamInspectionRepository } from "../../repositories";
import { PodRole, ScheduledWorkCoordinatorService } from "../../../common";
import { MediaMtxStreamInfo, V3PathItem } from "../../../infrastructure/media-mtx/types";
import {
    MediaMtxStreamListingService,
    MediaMtxStreamStatsService,
} from "../../../infrastructure/media-mtx/services";

@Injectable()
export class StreamInspectionService {
    private readonly logger = new Logger(StreamInspectionService.name);

    constructor(
        private readonly streamInspectionRepository: StreamInspectionRepository,
        private readonly mediaMtxListing: MediaMtxStreamListingService,
        private readonly mediaMtxStats: MediaMtxStreamStatsService,
        private readonly events: EventEmitter2,
        private readonly scheduledWork: ScheduledWorkCoordinatorService,
    ) {}

    async findLatest(streamName: string): Promise<StreamInspectionRecord | null> {
        return this.streamInspectionRepository.findLatest(streamName);
    }

    async findHistory(streamName: string, limit: number): Promise<StreamInspectionRecord[]> {
        return this.streamInspectionRepository.findHistory(streamName, limit);
    }

    async findAllLatest(): Promise<StreamInspectionRecord[]> {
        return this.streamInspectionRepository.findAllLatest();
    }

    @Cron(CronExpression.EVERY_30_SECONDS)
    async inspectAllStreams(): Promise<void> {
        const streams = await this.mediaMtxListing.listContextualStreams();
        await this.scheduledWork.processSequential(streams, async ({ stream, context }) => {
            await this.inspectStream(stream, context);
        });
    }

    async inspectStream(streamInfo: MediaMtxStreamInfo, source: PodRole): Promise<void> {
        try {
            const details = await this.mediaMtxStats.getStreamDetails(streamInfo.name, source);
            await this.recordInspection(streamInfo.name, source, details, null);
        } catch (error) {
            const lastError = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to inspect stream ${streamInfo.name}`, error);
            await this.recordInspection(streamInfo.name, source, null, lastError);
        }
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

        this.events.emit("stream.inspected", record);
    }
}

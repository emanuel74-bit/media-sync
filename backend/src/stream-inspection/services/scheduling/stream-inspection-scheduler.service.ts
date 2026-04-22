import { Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";

import { SequentialStreamTaskRunner } from "@/common";
import { MediaMtxStreamListingService } from "@/infrastructure";

import { StreamInspectionRecorderService } from "../recording";

@Injectable()
export class StreamInspectionSchedulerService {
    constructor(
        private readonly mediaMtxListing: MediaMtxStreamListingService,
        private readonly scheduledWork: SequentialStreamTaskRunner,
        private readonly recorder: StreamInspectionRecorderService,
    ) {}

    @Cron(CronExpression.EVERY_30_SECONDS)
    async inspectAllStreams(): Promise<void> {
        const streams = await this.mediaMtxListing.listContextualStreams();
        await this.scheduledWork.processSequential(streams, async ({ stream, context }) => {
            await this.recorder.inspectAndRecord(stream, context);
        });
    }
}

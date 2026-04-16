import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";

import { PodRole, SequentialStreamTaskRunner } from "../../../common";
import { MediaMtxStreamListingService } from "../../../infrastructure/media-mtx/services";
import { StreamInspectionRecorderService } from "./stream-inspection-recorder.service";

@Injectable()
export class StreamInspectionSchedulerService {
    private readonly logger = new Logger(StreamInspectionSchedulerService.name);

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

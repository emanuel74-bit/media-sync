import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";

import { ConfigService } from "../../../config";
import { SequentialStreamTaskRunner } from "../../../common/services";
import { StreamInspectionRecorderService } from "./stream-inspection-recorder.service";
import { MediaMtxStreamListingService } from "../../../infrastructure/media-mtx/services";

@Injectable()
export class StreamInspectionSchedulerService implements OnModuleInit, OnModuleDestroy {
    private inspectionInterval: NodeJS.Timeout | undefined;

    constructor(
        private readonly mediaMtxListing: MediaMtxStreamListingService,
        private readonly scheduledWork: SequentialStreamTaskRunner,
        private readonly recorder: StreamInspectionRecorderService,
        private readonly config: ConfigService,
    ) {}

    onModuleInit(): void {
        this.inspectionInterval = setInterval(
            () => void this.inspectAllStreams(),
            this.config.inspectionInterval,
        );
    }

    onModuleDestroy(): void {
        clearInterval(this.inspectionInterval);
    }

    async inspectAllStreams(): Promise<void> {
        const streams = await this.mediaMtxListing.listContextualStreams();
        await this.scheduledWork.processSequential(streams, async ({ stream, context }) => {
            await this.recorder.inspectAndRecord(stream, context);
        });
    }
}

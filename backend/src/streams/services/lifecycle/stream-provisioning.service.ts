import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { Stream } from "../../domain";
import { StreamStatus } from "../../../common/domain";
import { SystemEventNames } from "../../../common/events";
import { StreamCrudService } from "./stream-crud.service";
import { MediaMtxPipelineService } from "../../../infrastructure/media-mtx/services";

@Injectable()
export class StreamProvisioningService {
    private readonly logger = new Logger(StreamProvisioningService.name);

    constructor(
        private readonly streamCrud: StreamCrudService,
        private readonly mediaMtxService: MediaMtxPipelineService,
        private readonly events: EventEmitter2,
    ) {}

    async provisionClusterPipeline(stream: Stream): Promise<Stream> {
        try {
            await this.mediaMtxService.createClusterPullPipeline({
                name: stream.name,
                source: stream.source,
                status: stream.status,
            });
            const updated = await this.streamCrud.patch(stream.name, {
                status: StreamStatus.SYNCED,
                lastSyncedAt: new Date(),
                lastError: null,
            });
            const result = updated ?? stream;
            this.events.emit(SystemEventNames.STREAM_SYNCED, result);
            return result;
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to sync stream";
            this.logger.error(
                `Failed to provision cluster pipeline for ${stream.name}: ${message}`,
            );
            const updated = await this.streamCrud.patch(stream.name, {
                status: StreamStatus.SYNC_ERROR,
                lastError: message,
            });
            const result = updated ?? stream;
            this.events.emit(SystemEventNames.STREAM_SYNC_FAILURE, {
                stream: stream.name,
                error: message,
            });
            return result;
        }
    }
}

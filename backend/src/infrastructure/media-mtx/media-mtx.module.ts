import { Module } from "@nestjs/common";

import { RuntimeConfigModule } from "@/runtime-config";

import { MediaMtxClientFactory, MediaMtxClientRegistry } from "./registry";
import {
    MediaMtxPipelineService,
    MediaMtxStreamStatsService,
    StreamCollectionService,
} from "./services";

@Module({
    imports: [RuntimeConfigModule],
    providers: [
        MediaMtxClientFactory,
        MediaMtxClientRegistry,
        StreamCollectionService,
        MediaMtxStreamStatsService,
        MediaMtxPipelineService,
    ],
    exports: [
        MediaMtxClientFactory,
        MediaMtxClientRegistry,
        StreamCollectionService,
        MediaMtxStreamStatsService,
        MediaMtxPipelineService,
    ],
})
export class MediaMtxModule {}

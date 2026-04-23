import { Module } from "@nestjs/common";

import { PodsModule } from "@/pods";
import { ConfigModule } from "@/config";

import { MediaMtxClientFactory, MediaMtxClientRegistry } from "./registry";
import {
    MediaMtxPipelineService,
    MediaMtxStreamStatsService,
    MediaMtxStreamListingService,
    IngestStreamListingStrategy,
    ClusterStreamListingStrategy,
    StreamCollectionService,
} from "./services";

@Module({
    imports: [ConfigModule, PodsModule],
    providers: [
        MediaMtxClientFactory,
        MediaMtxClientRegistry,
        IngestStreamListingStrategy,
        ClusterStreamListingStrategy,
        StreamCollectionService,
        MediaMtxStreamListingService,
        MediaMtxStreamStatsService,
        MediaMtxPipelineService,
    ],
    exports: [
        MediaMtxClientFactory,
        MediaMtxClientRegistry,
        MediaMtxStreamListingService,
        MediaMtxStreamStatsService,
        MediaMtxPipelineService,
    ],
})
export class MediaMtxModule {}

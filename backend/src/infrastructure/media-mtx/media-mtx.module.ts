import { Module } from "@nestjs/common";

import { PodsModule } from "@/pods";
import { ConfigModule } from "@/config";

import {
    MediaMtxClientFactory,
    MediaMtxClientRegistry,
    ClusterNodeResolverService,
} from "./registry";
import {
    MediaMtxMetricsService,
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
        ClusterNodeResolverService,
        IngestStreamListingStrategy,
        ClusterStreamListingStrategy,
        StreamCollectionService,
        MediaMtxStreamListingService,
        MediaMtxStreamStatsService,
        MediaMtxPipelineService,
        MediaMtxMetricsService,
    ],
    exports: [
        MediaMtxClientFactory,
        MediaMtxClientRegistry,
        MediaMtxStreamListingService,
        MediaMtxStreamStatsService,
        MediaMtxPipelineService,
        MediaMtxMetricsService,
    ],
})
export class MediaMtxModule {}

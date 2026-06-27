import { Module, forwardRef } from "@nestjs/common";

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
    // forwardRef: PodsModule's file imports infrastructure schema/repo classes
    // through the @/infrastructure barrel, which evaluates this module first —
    // without the deferred reference PodsModule is undefined at scan time.
    imports: [ConfigModule, forwardRef(() => PodsModule)],
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

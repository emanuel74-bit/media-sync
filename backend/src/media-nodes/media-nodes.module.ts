import { Module } from "@nestjs/common";

import { PodsModule } from "@/pods";
import { ConfigModule } from "@/config";
import { MediaMtxModule } from "@/infrastructure";

import {
    NodeResolver,
    StreamCollectionService,
    MediaMtxMetricsService,
    MediaMtxPipelineService,
    MediaMtxStreamStatsService,
    MediaMtxStreamListingService,
} from "./services";

/**
 * Application layer over the MediaMTX gateway (`MediaMtxModule`): stream discovery, cluster
 * pipeline lifecycle, per-stream stats, metrics scraping, and node/URL resolution — resolving
 * live pod topology (`PodsModule`) and driving the gateway registry. Consumed by other
 * features via the exported services (ARCH-10).
 */
@Module({
    imports: [ConfigModule, PodsModule, MediaMtxModule],
    providers: [
        NodeResolver,
        StreamCollectionService,
        MediaMtxStreamListingService,
        MediaMtxStreamStatsService,
        MediaMtxPipelineService,
        MediaMtxMetricsService,
    ],
    exports: [
        NodeResolver,
        MediaMtxStreamListingService,
        MediaMtxStreamStatsService,
        MediaMtxPipelineService,
        MediaMtxMetricsService,
    ],
})
export class MediaNodesModule {}

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
 * Application layer over the MediaMTX gateway (`MediaMtxModule`). Owns the services that
 * operate media nodes — stream discovery, cluster pipeline lifecycle, per-stream stats,
 * and metrics scraping — resolving live pod topology (`PodsModule`) and driving the
 * gateway registry. Other features inject these four services (ARCH-10).
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
        MediaMtxStreamListingService,
        MediaMtxStreamStatsService,
        MediaMtxPipelineService,
        MediaMtxMetricsService,
    ],
})
export class MediaNodesModule {}

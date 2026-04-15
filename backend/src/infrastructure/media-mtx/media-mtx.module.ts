import { Module } from "@nestjs/common";

import { PodsModule } from "../../pods";
import { ConfigModule } from "../../config";
import { MediaMtxClientRegistry } from "./registry";
import {
    MediaMtxPipelineService,
    MediaMtxStreamStatsService,
    MediaMtxStreamListingService,
    IngestStreamListingStrategy,
    ClusterStreamListingStrategy,
} from "./services";

@Module({
    imports: [ConfigModule, PodsModule],
    providers: [
        MediaMtxClientRegistry,
        IngestStreamListingStrategy,
        ClusterStreamListingStrategy,
        MediaMtxStreamListingService,
        MediaMtxStreamStatsService,
        MediaMtxPipelineService,
    ],
    exports: [
        MediaMtxClientRegistry,
        MediaMtxStreamListingService,
        MediaMtxStreamStatsService,
        MediaMtxPipelineService,
    ],
})
export class MediaMtxModule {}

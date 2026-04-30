import { Module } from "@nestjs/common";

import { PodsModule } from "@/pods";
import { MediaMtxModule as InfrastructureMediaMtxModule } from "@/infrastructure/media-mtx/media-mtx.module";

import {
    ClusterStreamListingStrategy,
    IngestStreamListingStrategy,
    MediaMtxStreamListingService,
} from "./services";

@Module({
    imports: [InfrastructureMediaMtxModule, PodsModule],
    providers: [
        IngestStreamListingStrategy,
        ClusterStreamListingStrategy,
        MediaMtxStreamListingService,
    ],
    exports: [MediaMtxStreamListingService],
})
export class MediaMtxListingModule {}
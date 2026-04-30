import { Module } from "@nestjs/common";

import { MediaMtxModule as InfrastructureMediaMtxModule } from "@/infrastructure/media-mtx/media-mtx.module";

import { MediaMtxListingModule } from "./media-mtx-listing.module";

@Module({
    imports: [InfrastructureMediaMtxModule, MediaMtxListingModule],
    exports: [InfrastructureMediaMtxModule, MediaMtxListingModule],
})
export class MediaMtxModule {}

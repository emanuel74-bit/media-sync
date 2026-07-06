import { Module } from "@nestjs/common";

import { MediaMtxModule } from "@/infrastructure";
import { DatabaseModule } from "@/infrastructure/database";

import { StreamInspectionController } from "./controllers";
import { StreamInspectionQueryService, StreamInspectionCollectionService } from "./services";

@Module({
    imports: [DatabaseModule, MediaMtxModule],
    providers: [StreamInspectionCollectionService, StreamInspectionQueryService],
    controllers: [StreamInspectionController],
    exports: [StreamInspectionQueryService],
})
export class StreamInspectionModule {}

import { Module } from "@nestjs/common";

import { StreamsModule } from "@/streams";
import { MediaNodesModule } from "@/media-nodes";
import { DatabaseModule } from "@/infrastructure/database";

import { StreamInspectionController } from "./controllers";
import { StreamInspectionQueryService, StreamInspectionCollectionService } from "./services";

@Module({
    imports: [DatabaseModule, MediaNodesModule, StreamsModule],
    providers: [StreamInspectionCollectionService, StreamInspectionQueryService],
    controllers: [StreamInspectionController],
    exports: [StreamInspectionQueryService],
})
export class StreamInspectionModule {}

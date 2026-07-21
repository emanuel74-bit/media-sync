import { Module } from "@nestjs/common";

import { PodsModule } from "@/pods";
import { ConfigModule } from "@/config";
import { MediaNodesModule } from "@/media-nodes";
import { DatabaseModule } from "@/infrastructure/database";

import { IngestController, IngestAuthController, StreamsController } from "./controllers";
import {
    StreamQueryService,
    StreamAssignmentService,
    IngestPlacementService,
    StreamsFacadeService,
    StreamCrudService,
    StreamStatusService,
    StreamPipelineService,
    StreamSetupService,
    StreamReservationService,
    PublishAuthService,
} from "./services";

@Module({
    imports: [DatabaseModule, MediaNodesModule, PodsModule, ConfigModule],
    providers: [
        StreamQueryService,
        StreamsFacadeService,
        StreamCrudService,
        StreamPipelineService,
        StreamAssignmentService,
        IngestPlacementService,
        StreamStatusService,
        StreamSetupService,
        StreamReservationService,
        PublishAuthService,
    ],
    controllers: [IngestController, IngestAuthController, StreamsController],
    exports: [StreamsFacadeService, StreamQueryService],
})
export class StreamsModule {}

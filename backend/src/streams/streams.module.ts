import { Module } from "@nestjs/common";

import { PodsModule } from "@/pods";
import { MediaMtxModule } from "@/infrastructure";
import { DatabaseModule } from "@/infrastructure/database";

import { StreamsController } from "./controllers";
import {
    HashStreamAssignmentPolicy,
    StreamQueryService,
    StreamAssignmentService,
    StreamsFacadeService,
    StreamCrudService,
    StreamStatusService,
    StreamPipelineService,
    StreamSetupService,
    StreamAssignmentPolicy,
} from "./services";

@Module({
    imports: [DatabaseModule, MediaMtxModule, PodsModule],
    providers: [
        StreamQueryService,
        StreamsFacadeService,
        StreamCrudService,
        StreamPipelineService,
        StreamAssignmentService,
        StreamStatusService,
        StreamSetupService,
        { provide: StreamAssignmentPolicy, useClass: HashStreamAssignmentPolicy },
    ],
    controllers: [StreamsController],
    exports: [StreamsFacadeService, StreamQueryService],
})
export class StreamsModule {}

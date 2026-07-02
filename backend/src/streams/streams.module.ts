import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { PodsModule } from "@/pods";
import { MediaMtxModule } from "@/infrastructure";
import { MongoStreamRepository, Stream, StreamSchema } from "@/infrastructure";

import { StreamRepository } from "./repositories";
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
    imports: [
        MongooseModule.forFeature([{ name: Stream.name, schema: StreamSchema }]),
        MediaMtxModule,
        PodsModule,
    ],
    providers: [
        StreamQueryService,
        StreamsFacadeService,
        StreamCrudService,
        StreamPipelineService,
        StreamAssignmentService,
        StreamStatusService,
        StreamSetupService,
        { provide: StreamRepository, useClass: MongoStreamRepository },
        { provide: StreamAssignmentPolicy, useClass: HashStreamAssignmentPolicy },
    ],
    controllers: [StreamsController],
    exports: [StreamsFacadeService, StreamQueryService],
})
export class StreamsModule {}

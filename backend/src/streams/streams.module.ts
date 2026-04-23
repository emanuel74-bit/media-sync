import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { PodsModule } from "@/pods";
import { MediaMtxModule } from "@/infrastructure";
import { MongoStreamRepository, Stream, StreamSchema } from "@/infrastructure";

import { StreamRepository } from "./repositories";
import { StreamsController } from "./controllers";
import {
    StreamQueryService,
    StreamAssignmentService,
    StreamCrudService,
    StreamStatusService,
    StreamProvisioningService,
    StreamLifecycleService,
    StreamAssignmentPolicy,
} from "./services";
import { HashStreamAssignmentPolicy } from "./services/assignment/hash-stream-assignment.policy";

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Stream.name, schema: StreamSchema }]),
        MediaMtxModule,
        PodsModule,
    ],
    providers: [
        StreamQueryService,
        StreamCrudService,
        StreamProvisioningService,
        StreamAssignmentService,
        StreamStatusService,
        StreamLifecycleService,
        { provide: StreamRepository, useClass: MongoStreamRepository },
        { provide: StreamAssignmentPolicy, useClass: HashStreamAssignmentPolicy },
    ],
    controllers: [StreamsController],
    exports: [
        StreamQueryService,
        StreamProvisioningService,
        StreamAssignmentService,
        StreamStatusService,
    ],
})
export class StreamsModule {}

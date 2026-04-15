import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { PodsModule } from "../pods";
import { StreamRepository } from "./repositories";
import { StreamsController } from "./controllers";
import { StreamQueryService } from "./services/query";
import { MediaMtxModule } from "../infrastructure/media-mtx";
import { StreamAssignmentService } from "./services/assignment";
import { MongoStreamRepository } from "../infrastructure/database/repositories";
import { Stream, StreamSchema } from "../infrastructure/database/schemas/stream.schema";
import {
    StreamCrudService,
    StreamProvisioningService,
    StreamStatusService,
    StreamLifecycleService,
} from "./services/lifecycle";

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
    ],
    controllers: [StreamsController],
    exports: [
        StreamQueryService,
        StreamCrudService,
        StreamProvisioningService,
        StreamAssignmentService,
        StreamStatusService,
        StreamLifecycleService,
    ],
})
export class StreamsModule {}

import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { StreamsModule } from "../streams";
import { CommonModule } from "../common";
import { StreamInspectionController } from "./controllers";
import { StreamTrackAlertService } from "./services/alerts";
import { StreamInspectionRepository } from "./repositories";
import { MediaMtxModule } from "../infrastructure/media-mtx";
import { MongoStreamInspectionRepository } from "../infrastructure/database/repositories";
import {
    StreamInspection,
    StreamInspectionSchema,
} from "../infrastructure/database/schemas/stream-inspection.schema";
import {
    StreamInspectionService,
    StreamInspectionSchedulerService,
    StreamInspectionRecorderService,
    StreamInspectionQueryService,
} from "./services/inspection";

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: StreamInspection.name, schema: StreamInspectionSchema },
        ]),
        MediaMtxModule,
        StreamsModule,
        CommonModule,
    ],
    providers: [
        StreamInspectionSchedulerService,
        StreamInspectionRecorderService,
        StreamInspectionQueryService,
        StreamInspectionService,
        StreamTrackAlertService,
        {
            provide: StreamInspectionRepository,
            useClass: MongoStreamInspectionRepository,
        },
    ],
    controllers: [StreamInspectionController],
    exports: [StreamInspectionService, StreamInspectionQueryService],
})
export class StreamInspectionModule {}

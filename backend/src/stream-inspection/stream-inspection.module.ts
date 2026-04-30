import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { AlertsModule } from "@/alerts";
import { StreamsModule } from "@/streams";
import { MediaMtxModule } from "@/media-mtx";
import { TaskSequencingModule } from "@/task-sequencing";
import {
    MongoStreamInspectionRepository,
    StreamInspection,
    StreamInspectionSchema,
} from "@/infrastructure";

import { StreamInspectionController } from "./controllers";
import { StreamInspectionRepository } from "./repositories";
import {
    StreamTrackAlertService,
    StreamInspectionQueryService,
    StreamInspectionRecorderService,
    StreamInspectionSchedulerService,
} from "./services";

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: StreamInspection.name, schema: StreamInspectionSchema },
        ]),
        AlertsModule,
        MediaMtxModule,
        StreamsModule,
        TaskSequencingModule,
    ],
    providers: [
        StreamInspectionSchedulerService,
        StreamInspectionRecorderService,
        StreamInspectionQueryService,
        StreamTrackAlertService,
        {
            provide: StreamInspectionRepository,
            useClass: MongoStreamInspectionRepository,
        },
    ],
    controllers: [StreamInspectionController],
    exports: [StreamInspectionQueryService],
})
export class StreamInspectionModule {}

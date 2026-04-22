import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { CommonModule } from "@/common";
import { StreamsModule } from "@/streams";
import { MediaMtxModule } from "@/infrastructure";
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
        MediaMtxModule,
        StreamsModule,
        CommonModule,
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

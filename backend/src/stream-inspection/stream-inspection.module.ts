import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { CommonModule } from "../common";
import { StreamsModule } from "../streams";
import { StreamInspectionController } from "./controllers";
import { StreamTrackAlertService } from "./services/alerts";
import { StreamInspectionRepository } from "./repositories";
import { MediaMtxModule } from "../infrastructure/media-mtx";
import { MongoStreamInspectionRepository } from "../infrastructure/database/repositories";
import {
    StreamInspection,
    StreamInspectionSchema,
} from "../infrastructure/database/schemas/stream-inspection.schema";
import { StreamInspectionQueryService } from "./services/query";
import { StreamInspectionRecorderService } from "./services/recording";
import { StreamInspectionSchedulerService } from "./services/scheduling";

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

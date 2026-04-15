import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { StreamsModule } from "../streams";
import { CommonServicesModule } from "../common";
import { StreamInspectionController } from "./controllers";
import { StreamTrackAlertService } from "./services/alerts";
import { StreamInspectionRepository } from "./repositories";
import { MediaMtxModule } from "../infrastructure/media-mtx";
import { StreamInspectionService } from "./services/inspection";
import { MongoStreamInspectionRepository } from "../infrastructure/database/repositories";
import {
    StreamInspection,
    StreamInspectionSchema,
} from "../infrastructure/database/schemas/stream-inspection.schema";

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: StreamInspection.name, schema: StreamInspectionSchema },
        ]),
        MediaMtxModule,
        StreamsModule,
        CommonServicesModule,
    ],
    providers: [
        StreamInspectionService,
        StreamTrackAlertService,
        {
            provide: StreamInspectionRepository,
            useClass: MongoStreamInspectionRepository,
        },
    ],
    controllers: [StreamInspectionController],
    exports: [StreamInspectionService],
})
export class StreamInspectionModule {}

import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { MediaMtxModule } from "@/infrastructure";
import {
    MongoStreamInspectionRepository,
    StreamInspection,
    StreamInspectionSchema,
} from "@/infrastructure";

import { StreamInspectionController } from "./controllers";
import { StreamInspectionRepository } from "./repositories";
import { StreamInspectionQueryService, StreamInspectionCollectionService } from "./services";

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: StreamInspection.name, schema: StreamInspectionSchema },
        ]),
        MediaMtxModule,
    ],
    providers: [
        StreamInspectionCollectionService,
        StreamInspectionQueryService,
        {
            provide: StreamInspectionRepository,
            useClass: MongoStreamInspectionRepository,
        },
    ],
    controllers: [StreamInspectionController],
    exports: [StreamInspectionQueryService],
})
export class StreamInspectionModule {}

import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ScheduleModule } from "@nestjs/schedule";
import { EventEmitterModule } from "@nestjs/event-emitter";

import { PodsModule } from "./pods";
import { SyncModule } from "./sync";
import { AlertsModule } from "./alerts";
import { RuntimeConfigModule } from "./runtime-config";
import { MetricsModule } from "./metrics";
import { MediaMtxModule } from "./media-mtx";
import { StreamsModule } from "./streams";
import { StreamInspectionModule } from "./stream-inspection";
import { SystemEventsModule } from "./system-events";

@Module({
    imports: [
        RuntimeConfigModule,
        ScheduleModule.forRoot(),
        EventEmitterModule.forRoot(),
        MongooseModule.forRoot(process.env.MONGODB_URI ?? "mongodb://localhost:27017/media-sync"),
        MediaMtxModule,
        StreamsModule,
        SyncModule,
        MetricsModule,
        AlertsModule,
        SystemEventsModule,
        StreamInspectionModule,
        PodsModule,
    ],
    controllers: [],
    providers: [],
})
export class AppModule {}

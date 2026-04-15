import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ScheduleModule } from "@nestjs/schedule";
import { EventEmitterModule } from "@nestjs/event-emitter";

import { PodsModule } from "./pods";
import { SyncModule } from "./sync";
import { AlertsModule } from "./alerts";
import { ConfigModule } from "./config";
import { GatewayModule } from "./gateway";
import { MetricsModule } from "./metrics";
import { StreamsModule } from "./streams";
import { MediaMtxModule } from "./infrastructure/media-mtx";
import { StreamInspectionModule } from "./stream-inspection";

@Module({
    imports: [
        ConfigModule,
        ScheduleModule.forRoot(),
        EventEmitterModule.forRoot(),
        MongooseModule.forRoot(process.env.MONGODB_URI ?? "mongodb://localhost:27017/media-sync"),
        MediaMtxModule,
        StreamsModule,
        SyncModule,
        MetricsModule,
        AlertsModule,
        GatewayModule,
        StreamInspectionModule,
        PodsModule,
    ],
    controllers: [],
    providers: [],
})
export class AppModule {}

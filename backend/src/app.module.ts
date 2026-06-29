import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { EventEmitterModule } from "@nestjs/event-emitter";

import { PodsModule } from "./pods";
import { SyncModule } from "./sync";
import { AlertsModule } from "./alerts";
import { ConfigModule } from "./config";
import { GatewayModule } from "./gateway";
import { MetricsModule } from "./metrics";
import { StreamsModule } from "./streams";
import { SchedulingModule } from "./common";
import { MediaMtxModule } from "./infrastructure";
import { StreamInspectionModule } from "./stream-inspection";

@Module({
    imports: [
        ConfigModule,
        SchedulingModule,
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

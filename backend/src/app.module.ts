import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { EventEmitterModule } from "@nestjs/event-emitter";

import { SyncModule } from "./sync";
import { NodesModule } from "./nodes";
import { AlertsModule } from "./alerts";
import { ConfigModule } from "./config";
import { GatewayModule } from "./gateway";
import { MetricsModule } from "./metrics";
import { StreamsModule } from "./streams";
import { SchedulingModule } from "./common";
import { MediaNodesModule } from "./media-nodes";
import { StreamInspectionModule } from "./stream-inspection";

@Module({
    imports: [
        ConfigModule,
        SchedulingModule,
        EventEmitterModule.forRoot(),
        MongooseModule.forRoot(process.env.MONGODB_URI ?? "mongodb://localhost:27017/media-sync"),
        MediaNodesModule,
        StreamsModule,
        SyncModule,
        MetricsModule,
        AlertsModule,
        GatewayModule,
        StreamInspectionModule,
        NodesModule,
    ],
    controllers: [],
    providers: [],
})
export class AppModule {}

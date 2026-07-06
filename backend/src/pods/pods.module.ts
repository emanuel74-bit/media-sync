import { Module } from "@nestjs/common";

import { ConfigModule } from "@/config";
import { DatabaseModule } from "@/infrastructure/database";

import { PodsController } from "./controllers";
import { PodLifecycleService, PodQueryService } from "./services";

@Module({
    imports: [DatabaseModule, ConfigModule],
    providers: [PodLifecycleService, PodQueryService],
    controllers: [PodsController],
    exports: [PodLifecycleService, PodQueryService],
})
export class PodsModule {}

import { Module } from "@nestjs/common";

import { ConfigModule } from "@/config";
import { DatabaseModule } from "@/infrastructure/database";

import { NodesController } from "./controllers";
import { NodeLifecycleService, NodeQueryService } from "./services";

@Module({
    imports: [DatabaseModule, ConfigModule],
    providers: [NodeLifecycleService, NodeQueryService],
    controllers: [NodesController],
    exports: [NodeLifecycleService, NodeQueryService],
})
export class NodesModule {}

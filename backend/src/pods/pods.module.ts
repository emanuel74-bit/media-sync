import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { ConfigModule } from "@/config";
import { MongoPodRepository, Pod, PodSchema } from "@/infrastructure";

import { PodRepository } from "./repositories";
import { PodsController } from "./controllers";
import { PodLifecycleService, PodQueryService } from "./services";

@Module({
    imports: [MongooseModule.forFeature([{ name: Pod.name, schema: PodSchema }]), ConfigModule],
    providers: [
        PodLifecycleService,
        PodQueryService,
        { provide: PodRepository, useClass: MongoPodRepository },
    ],
    controllers: [PodsController],
    exports: [PodLifecycleService, PodQueryService],
})
export class PodsModule {}

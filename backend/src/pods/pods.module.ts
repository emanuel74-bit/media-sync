import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { MongoPodRepository, Pod, PodSchema } from "@/infrastructure";
import { RuntimeConfigModule } from "@/runtime-config";

import { PodRepository } from "./repositories";
import { PodsController } from "./controllers";
import { PodRegistrationService, PodQueryService } from "./services";

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Pod.name, schema: PodSchema }]),
        RuntimeConfigModule,
    ],
    providers: [
        PodRegistrationService,
        PodQueryService,
        { provide: PodRepository, useClass: MongoPodRepository },
    ],
    controllers: [PodsController],
    exports: [PodRegistrationService, PodQueryService],
})
export class PodsModule {}

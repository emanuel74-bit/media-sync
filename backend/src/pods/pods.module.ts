import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { ConfigModule } from "@/config";
import { MongoPodRepository, Pod, PodSchema } from "@/infrastructure";

import { PodRepository } from "./repositories";
import { PodsController } from "./controllers";
import { PodRegistrationService, PodQueryService } from "./services";

@Module({
    imports: [MongooseModule.forFeature([{ name: Pod.name, schema: PodSchema }]), ConfigModule],
    providers: [
        PodRegistrationService,
        PodQueryService,
        { provide: PodRepository, useClass: MongoPodRepository },
    ],
    controllers: [PodsController],
    exports: [PodRegistrationService, PodQueryService],
})
export class PodsModule {}

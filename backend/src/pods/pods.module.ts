import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { ConfigModule } from "../config";
import { PodRepository } from "./repositories";
import { PodsController } from "./controllers";
import { MongoPodRepository } from "../infrastructure/database/repositories";
import { Pod, PodSchema } from "../infrastructure/database/schemas/pod.schema";
import { PodsService, PodRegistrationService, PodQueryService } from "./services";

@Module({
    imports: [MongooseModule.forFeature([{ name: Pod.name, schema: PodSchema }]), ConfigModule],
    providers: [
        PodRegistrationService,
        PodQueryService,
        PodsService,
        { provide: PodRepository, useClass: MongoPodRepository },
    ],
    controllers: [PodsController],
    exports: [PodsService, PodRegistrationService, PodQueryService],
})
export class PodsModule {}

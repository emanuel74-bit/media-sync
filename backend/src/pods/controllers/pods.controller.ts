import { ApiTags } from "@nestjs/swagger";
import { Body, Controller, Get, Post } from "@nestjs/common";

import { PodRole } from "../../common";
import { RegisterPodDto } from "../dto";
import { PodRegistrationService, PodQueryService } from "../services";

@ApiTags("pods")
@Controller("api/pods")
export class PodsController {
    constructor(
        private readonly podRegistration: PodRegistrationService,
        private readonly podQuery: PodQueryService,
    ) {}

    @Get()
    async listPods() {
        return this.podQuery.listPods();
    }

    @Get("active")
    async listActivePods() {
        return this.podQuery.getActivePods();
    }

    @Post("register")
    async registerPod(@Body() dto: RegisterPodDto) {
        return this.podRegistration.registerPod({
            podId: dto.podId,
            host: dto.host,
            tags: dto.tags ?? [],
            type: dto.type ?? PodRole.CLUSTER,
        });
    }

    @Post("heartbeat")
    async heartbeat(@Body() dto: RegisterPodDto) {
        return this.podRegistration.heartbeat(dto.podId);
    }
}

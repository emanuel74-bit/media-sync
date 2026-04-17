import { ApiTags } from "@nestjs/swagger";
import { Body, Controller, Get, Post } from "@nestjs/common";

import { Pod } from "../domain";
import { RegisterPodDto } from "../dto";
import { PodRole } from "../../common/domain";
import { PodRegistrationService, PodQueryService } from "../services";

@ApiTags("pods")
@Controller("api/pods")
export class PodsController {
    constructor(
        private readonly podRegistration: PodRegistrationService,
        private readonly podQuery: PodQueryService,
    ) {}

    @Get()
    async listPods(): Promise<Pod[]> {
        return this.podQuery.listPods();
    }

    @Get("active")
    async listActivePods(): Promise<Pod[]> {
        return this.podQuery.getActivePods();
    }

    @Post("register")
    async registerPod(@Body() dto: RegisterPodDto): Promise<Pod> {
        return this.podRegistration.registerPod({
            podId: dto.podId,
            host: dto.host,
            tags: dto.tags ?? [],
            type: dto.type ?? PodRole.CLUSTER,
        });
    }

    @Post("heartbeat")
    async heartbeat(@Body() dto: RegisterPodDto): Promise<Pod> {
        return this.podRegistration.heartbeat(dto.podId);
    }
}

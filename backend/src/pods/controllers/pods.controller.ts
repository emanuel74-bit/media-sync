import { ApiTags } from "@nestjs/swagger";
import { Body, Controller, Get, Post } from "@nestjs/common";

import { PodRole } from "../../common";
import { RegisterPodDto } from "../dto";
import { PodsService } from "../services";

@ApiTags("pods")
@Controller("api/pods")
export class PodsController {
    constructor(private readonly podsService: PodsService) {}

    @Get()
    async listPods() {
        return this.podsService.listPods();
    }

    @Get("active")
    async listActivePods() {
        return this.podsService.getActivePods();
    }

    @Post("register")
    async registerPod(@Body() dto: RegisterPodDto) {
        return this.podsService.registerPod({
            podId: dto.podId,
            host: dto.host,
            tags: dto.tags ?? [],
            type: dto.type ?? PodRole.CLUSTER,
        });
    }

    @Post("heartbeat")
    async heartbeat(@Body() dto: RegisterPodDto) {
        return this.podsService.heartbeat(dto.podId);
    }
}

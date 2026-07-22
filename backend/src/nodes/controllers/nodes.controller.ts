import { ApiTags } from "@nestjs/swagger";
import { Body, Controller, Get, Post } from "@nestjs/common";

import { Node } from "../domain";
import { RegisterNodeDto, HeartbeatDto } from "../dto";
import { NodeLifecycleService, NodeQueryService } from "../services";

@ApiTags("nodes")
@Controller("api/nodes")
export class NodesController {
    constructor(
        private readonly nodeLifecycle: NodeLifecycleService,
        private readonly nodeQuery: NodeQueryService,
    ) {}

    @Get()
    async listNodes(): Promise<Node[]> {
        return this.nodeQuery.listNodes();
    }

    @Get("active")
    async listActiveNodes(): Promise<Node[]> {
        return this.nodeQuery.getActiveNodes();
    }

    @Post("register")
    async registerNode(@Body() dto: RegisterNodeDto): Promise<Node> {
        return this.nodeLifecycle.registerNode({
            nodeId: dto.nodeId,
            host: dto.host,
            apiPort: dto.apiPort,
            rtspPort: dto.rtspPort,
            metricsPort: dto.metricsPort,
            type: dto.type,
            resources: dto.resources,
        });
    }

    @Post("heartbeat")
    async heartbeat(@Body() dto: HeartbeatDto): Promise<Node> {
        return this.nodeLifecycle.heartbeat({ nodeId: dto.nodeId, resources: dto.resources });
    }
}

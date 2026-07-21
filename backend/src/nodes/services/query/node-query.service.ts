import { Injectable } from "@nestjs/common";

import { NodeRole } from "@/common";
import { ConfigService } from "@/config";

import { Node, ActiveNodeRef } from "../../domain";
import { NodeRepository } from "../../repositories";

@Injectable()
export class NodeQueryService {
    constructor(
        private readonly nodeRepository: NodeRepository,
        private readonly config: ConfigService,
    ) {}

    private activeSince(): Date {
        return new Date(Date.now() - this.config.nodeHeartbeatToleranceSeconds * 1000);
    }

    async listNodes(): Promise<Node[]> {
        return this.nodeRepository.findAll();
    }

    async getActiveNodes(role?: NodeRole): Promise<Node[]> {
        return this.nodeRepository.findActive(this.activeSince(), role);
    }

    async listActiveNodeRefs(role?: NodeRole): Promise<ActiveNodeRef[]> {
        const nodes = await this.nodeRepository.findActive(this.activeSince(), role);
        return nodes.map((node) => ({
            nodeId: node.nodeId,
            host: node.host,
            apiPort: node.apiPort,
            rtspPort: node.rtspPort,
            metricsPort: node.metricsPort,
            type: node.type,
        }));
    }

    async listActiveNodeIds(role?: NodeRole): Promise<string[]> {
        const refs = await this.listActiveNodeRefs(role);
        return refs.map((node) => node.nodeId);
    }
}

import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { ConfigService } from "@/config";
import { NodeRole, NodeStatus, SystemEventNames, NodeSampledPayload } from "@/common";

import { NodeRepository } from "../../repositories";
import { Node, NodeResources, NodeHeartbeatData, NodeRegistrationData } from "../../domain";

@Injectable()
export class NodeLifecycleService {
    private readonly logger = new Logger(NodeLifecycleService.name);

    constructor(
        private readonly nodeRepository: NodeRepository,
        private readonly config: ConfigService,
        private readonly events: EventEmitter2,
    ) {}

    async registerNode(request: NodeRegistrationData): Promise<Node> {
        const defaultApiPort =
            request.type === NodeRole.INGEST
                ? this.config.ingestNodeMediaMtxPort
                : this.config.clusterNodeMediaMtxPort;

        const node = await this.nodeRepository.upsertByNodeId(request.nodeId, {
            status: NodeStatus.ACTIVE,
            lastHeartbeatAt: new Date(),
            host: request.host,
            type: request.type,
            apiPort: request.apiPort ?? defaultApiPort,
            rtspPort: request.rtspPort ?? this.config.mediaMtxRtspPort,
            metricsPort: request.metricsPort ?? this.config.mediaMtxMetricsPort,
        });
        this.logger.log(`Registered/heartbeat node: ${request.nodeId}`);
        this.events.emit(SystemEventNames.NODE_REGISTERED, node);
        this.emitNodeSample(node, request.resources);
        return node;
    }

    async heartbeat(request: NodeHeartbeatData): Promise<Node> {
        const node = await this.nodeRepository.upsertByNodeId(request.nodeId, {
            status: NodeStatus.ACTIVE,
            lastHeartbeatAt: new Date(),
        });
        this.emitNodeSample(node, request.resources);
        return node;
    }

    /** Forward self-reported host resources to the alerts pipeline (ADR-0011). */
    private emitNodeSample(node: Node, resources?: NodeResources): void {
        if (!resources) {
            return;
        }
        const payload: NodeSampledPayload = {
            nodeId: node.nodeId,
            context: node.type,
            cpu: resources.cpu,
            memory: resources.memory,
            disk: resources.disk,
        };
        this.events.emit(SystemEventNames.NODE_SAMPLED, payload);
    }
}

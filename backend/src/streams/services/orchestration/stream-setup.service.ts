import { Injectable } from "@nestjs/common";

import { NodeRole } from "@/common";
import { NodeQueryService } from "@/nodes";

import { CreateStreamData, Stream } from "../../domain";
import { StreamAssignmentService } from "../assignment";
import { StreamPipelineService } from "./stream-pipeline.service";
import { StreamCrudService, StreamStatusService } from "../mutation";

/**
 * The manual birth flow (`POST /api/streams`): creates a stream with a known external source and
 * **immediately** assigns it to a cluster node and deploys the relay. (The ingest birth flow is
 * separate — `StreamReservationService`.)
 */
@Injectable()
export class StreamSetupService {
    constructor(
        private readonly streamCrud: StreamCrudService,
        private readonly streamStatus: StreamStatusService,
        private readonly streamAssignment: StreamAssignmentService,
        private readonly nodesService: NodeQueryService,
        private readonly streamPipeline: StreamPipelineService,
    ) {}

    async onboard(data: CreateStreamData): Promise<Stream> {
        const stream = await this.streamCrud.create(data);
        return this.assignAndDeploy(stream);
    }

    private async assignAndDeploy(stream: Stream): Promise<Stream> {
        const consumerNodes = await this.nodesService.listActiveNodeIds(NodeRole.CLUSTER);

        if (!consumerNodes.length) {
            return this.streamStatus.markPendingAssignment(
                stream.name,
                "No active cluster nodes available",
            );
        }

        const current = await this.streamAssignment.ensureAssigned(stream.name, consumerNodes);

        return this.streamPipeline.deploy(current);
    }
}

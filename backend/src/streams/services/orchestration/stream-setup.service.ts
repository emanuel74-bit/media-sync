import { Injectable } from "@nestjs/common";

import { PodRole } from "@/common";
import { PodQueryService } from "@/pods";

import { CreateStreamData, Stream } from "../../domain";
import { StreamAssignmentService } from "../assignment";
import { StreamPipelineService } from "./stream-pipeline.service";
import { StreamCrudService, StreamStatusService } from "../mutation";

@Injectable()
export class StreamSetupService {
    constructor(
        private readonly streamCrud: StreamCrudService,
        private readonly streamStatus: StreamStatusService,
        private readonly streamAssignment: StreamAssignmentService,
        private readonly podsService: PodQueryService,
        private readonly streamPipeline: StreamPipelineService,
    ) {}

    async onboard(data: CreateStreamData): Promise<Stream> {
        const stream = await this.streamCrud.create(data);
        return this.assignAndDeploy(stream);
    }

    private async assignAndDeploy(stream: Stream): Promise<Stream> {
        const consumerPods = await this.podsService.listActivePodIds(PodRole.CLUSTER);

        if (!consumerPods.length) {
            return this.streamStatus.markPendingAssignment(
                stream.name,
                "No active cluster pods available",
            );
        }

        const current = await this.streamAssignment.ensureAssigned(stream.name, consumerPods);

        return this.streamPipeline.deploy(current);
    }
}

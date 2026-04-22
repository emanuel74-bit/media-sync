import { Injectable } from "@nestjs/common";

import { PodQueryService } from "@/pods";
import { PodRole, StreamStatus } from "@/common";
import { Stream, CreateStreamData } from "@/streams";

import { StreamCrudService } from "../mutation";
import { StreamAssignmentService } from "../assignment";
import { StreamProvisioningService } from "./stream-provisioning.service";

@Injectable()
export class StreamLifecycleService {
    constructor(
        private readonly streamCrud: StreamCrudService,
        private readonly streamAssignment: StreamAssignmentService,
        private readonly podsService: PodQueryService,
        private readonly streamProvisioning: StreamProvisioningService,
    ) {}

    async create(data: CreateStreamData): Promise<Stream> {
        const stream = await this.streamCrud.create(data);
        return this.assignAndProvision(stream);
    }

    private async assignAndProvision(stream: Stream): Promise<Stream> {
        const consumerPods = await this.podsService.listActivePodIds(PodRole.CLUSTER);

        if (!consumerPods.length) {
            return (
                (await this.streamCrud.patch(stream.name, {
                    lastError: "No active cluster pods available",
                    status: StreamStatus.PENDING_ASSIGNMENT,
                })) ?? stream
            );
        }

        const current = await this.streamAssignment.ensureAssigned(stream.name, consumerPods);

        return this.streamProvisioning.provisionClusterPipeline(current);
    }
}

import { Injectable } from "@nestjs/common";

import { Stream } from "../../domain";
import { CreateStreamDto } from "../../dto";
import { PodQueryService } from "../../../pods/services";
import { StreamAssignmentService } from "../assignment";
import { PodRole, StreamStatus } from "../../../common";
import { StreamCrudService } from "./stream-crud.service";
import { StreamProvisioningService } from "./stream-provisioning.service";

@Injectable()
export class StreamLifecycleService {
    constructor(
        private readonly streamCrud: StreamCrudService,
        private readonly streamAssignment: StreamAssignmentService,
        private readonly podsService: PodQueryService,
        private readonly streamProvisioning: StreamProvisioningService,
    ) {}

    async create(createStreamDto: CreateStreamDto): Promise<Stream> {
        const stream = await this.streamCrud.create(createStreamDto);
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

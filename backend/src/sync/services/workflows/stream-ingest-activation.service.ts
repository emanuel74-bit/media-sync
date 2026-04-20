import { Injectable } from "@nestjs/common";

import { Stream } from "../../../streams/domain";
import { StreamAssignmentService } from "../../../streams/services/assignment";
import { StreamProvisioningService } from "../../../streams/services/orchestration";

@Injectable()
export class StreamIngestActivationService {
    constructor(
        private readonly streamAssignment: StreamAssignmentService,
        private readonly streamProvisioning: StreamProvisioningService,
    ) {}

    async ensurePodAssignment(stream: Stream, podIds: string[]): Promise<Stream> {
        return this.streamAssignment.ensureAssigned(stream.name, podIds);
    }

    async ensureClusterPipeline(stream: Stream, clusterNames: Set<string>): Promise<void> {
        if (!clusterNames.has(stream.name)) {
            await this.streamProvisioning.provisionClusterPipeline(stream);
        }
    }
}

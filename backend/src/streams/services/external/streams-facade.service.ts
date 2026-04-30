import { Injectable } from "@nestjs/common";

import { Stream } from "../../domain/types/stream.types";

import { StreamAssignmentService } from "../assignment/stream-assignment.service";
import { StreamStatusService } from "../mutation/stream-status.service";
import { StreamProvisioningService } from "../orchestration/stream-provisioning.service";
import { StreamQueryService } from "../query/stream-query.service";

@Injectable()
export class StreamsFacadeService {
    constructor(
        private readonly streamQuery: StreamQueryService,
        private readonly streamStatus: StreamStatusService,
        private readonly streamAssignment: StreamAssignmentService,
        private readonly streamProvisioning: StreamProvisioningService,
    ) {}

    async findAll(): Promise<Stream[]> {
        return this.streamQuery.findAll();
    }

    async findByName(name: string): Promise<Stream | null> {
        return this.streamQuery.findByName(name);
    }

    async findAssignedByName(name: string): Promise<Stream | null> {
        return this.streamQuery.findAssignedByName(name);
    }

    async upsertFromDiscovery(info: Partial<Stream> & { name: string }): Promise<Stream> {
        return this.streamStatus.upsertFromDiscovery(info);
    }

    async markStale(name: string): Promise<void> {
        await this.streamStatus.markStale(name);
    }

    async ensureAssigned(name: string, candidatePods: string[]): Promise<Stream> {
        return this.streamAssignment.ensureAssigned(name, candidatePods);
    }

    async reassign(name: string, candidatePods: string[]): Promise<Stream> {
        return this.streamAssignment.reassign(name, candidatePods);
    }

    async provisionClusterPipeline(stream: Stream): Promise<Stream> {
        return this.streamProvisioning.provisionClusterPipeline(stream);
    }
}

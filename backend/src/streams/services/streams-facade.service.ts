import { Injectable } from "@nestjs/common";

import { MediaMtxPipelineService } from "@/infrastructure";

import { Stream } from "../domain";
import { StreamQueryService } from "./query";
import { StreamStatusService } from "./mutation";
import { StreamAssignmentService } from "./assignment";
import { StreamProvisioningService } from "./orchestration";

@Injectable()
export class StreamsFacadeService {
    constructor(
        private readonly streamQuery: StreamQueryService,
        private readonly streamStatus: StreamStatusService,
        private readonly streamAssignment: StreamAssignmentService,
        private readonly streamProvisioning: StreamProvisioningService,
        private readonly mediaMtxPipeline: MediaMtxPipelineService,
    ) {}

    async findAll(): Promise<Stream[]> {
        return this.streamQuery.findAll();
    }

    async upsertFromDiscovery(info: Partial<Stream> & { name: string }): Promise<Stream> {
        return this.streamStatus.upsertFromDiscovery(info);
    }

    async ensureAssigned(name: string, candidatePods: string[]): Promise<Stream> {
        return this.streamAssignment.ensureAssigned(name, candidatePods);
    }

    async provisionClusterPipeline(stream: Stream): Promise<Stream> {
        return this.streamProvisioning.provisionClusterPipeline(stream);
    }

    async createClusterPipeline(stream: Stream): Promise<void> {
        await this.mediaMtxPipeline.createClusterPullPipeline({
            name: stream.name,
            source: stream.source,
            status: stream.status,
        });
    }

    async markStale(name: string): Promise<void> {
        await this.streamStatus.markStale(name);
    }
}

import { Injectable } from "@nestjs/common";

import { Stream } from "../domain";
import { StreamQueryService } from "./query";
import { StreamStatusService } from "./mutation";
import { StreamAssignmentService } from "./assignment";
import { StreamPipelineService } from "./orchestration";

@Injectable()
export class StreamsFacadeService {
    constructor(
        private readonly streamQuery: StreamQueryService,
        private readonly streamStatus: StreamStatusService,
        private readonly streamAssignment: StreamAssignmentService,
        private readonly streamPipeline: StreamPipelineService,
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
        return this.streamPipeline.deploy(stream);
    }

    async createClusterPipeline(stream: Stream): Promise<void> {
        await this.streamPipeline.build(stream);
    }

    async markStale(name: string): Promise<void> {
        await this.streamStatus.markStale(name);
    }
}

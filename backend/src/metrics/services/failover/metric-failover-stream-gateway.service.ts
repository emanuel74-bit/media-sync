import { Injectable } from "@nestjs/common";

import { Stream, StreamAssignmentService, StreamQueryService } from "@/streams";

@Injectable()
export class MetricFailoverStreamGatewayService {
    constructor(
        private readonly streamQuery: StreamQueryService,
        private readonly streamAssignment: StreamAssignmentService,
    ) {}

    async findAssignedStream(name: string): Promise<Stream | null> {
        return this.streamQuery.findAssignedByName(name);
    }

    async reassignStream(name: string, candidatePods: string[]): Promise<Stream> {
        return this.streamAssignment.reassign(name, candidatePods);
    }
}

import { Injectable } from "@nestjs/common";

import { Stream, StreamsFacadeService } from "@/streams";

@Injectable()
export class StreamIngestActivationService {
    constructor(private readonly streams: StreamsFacadeService) {}

    async ensurePodAssignment(stream: Stream, podIds: string[]): Promise<Stream> {
        return this.streams.ensureAssigned(stream.name, podIds);
    }

    async ensureClusterPipeline(stream: Stream, clusterNames: Set<string>): Promise<void> {
        if (!clusterNames.has(stream.name)) {
            await this.streams.provisionClusterPipeline(stream);
        }
    }
}

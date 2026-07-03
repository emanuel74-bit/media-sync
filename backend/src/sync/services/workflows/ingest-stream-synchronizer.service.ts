import { Injectable } from "@nestjs/common";

import { StreamsFacadeService } from "@/streams";

import { SyncContext, SyncDiscoveredStream } from "../../domain";
import { IngestStreamDiscoveryService } from "./ingest-stream-discovery.service";

@Injectable()
export class IngestStreamSynchronizerService {
    constructor(
        private readonly ingestDiscovery: IngestStreamDiscoveryService,
        private readonly streams: StreamsFacadeService,
    ) {}

    async execute(context: SyncContext): Promise<void> {
        for (const ingest of context.ingestList) {
            await this.syncStream(ingest, context.clusterNames, context.podIds);
        }
    }

    private async syncStream(
        ingest: SyncDiscoveredStream,
        clusterNames: Set<string>,
        podIds: string[],
    ): Promise<void> {
        const discovered = await this.ingestDiscovery.upsertDiscoveredStream(ingest);
        const assigned = await this.streams.ensureAssigned(discovered.name, podIds);

        if (!clusterNames.has(assigned.name)) {
            await this.streams.deployClusterPipeline(assigned);
        }
    }
}

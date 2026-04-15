import { Injectable } from "@nestjs/common";

import { SyncContext, SyncDiscoveredStream, SyncWorkflow } from "../../domain";
import { StreamIngestDiscoveryService } from "./stream-ingest-discovery.service";
import { StreamIngestActivationService } from "./stream-ingest-activation.service";

@Injectable()
export class StreamIngestSyncService implements SyncWorkflow {
    constructor(
        private readonly ingestDiscovery: StreamIngestDiscoveryService,
        private readonly ingestActivation: StreamIngestActivationService,
    ) {}

    async syncAll(
        ingestList: SyncDiscoveredStream[],
        clusterNames: Set<string>,
        podIds: string[],
    ): Promise<void> {
        for (const ingest of ingestList) {
            await this.syncStream(ingest, clusterNames, podIds);
        }
    }

    async execute(context: SyncContext): Promise<void> {
        await this.syncAll(context.ingestList, context.clusterNames, context.podIds);
    }

    async syncStream(
        ingest: SyncDiscoveredStream,
        clusterNames: Set<string>,
        podIds: string[],
    ): Promise<void> {
        let stream = await this.ingestDiscovery.upsertDiscoveredStream(ingest);
        stream = await this.ingestActivation.ensurePodAssignment(stream, podIds);
        await this.ingestActivation.ensureClusterPipeline(stream, clusterNames);
    }
}

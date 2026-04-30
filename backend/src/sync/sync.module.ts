import { Module } from "@nestjs/common";

import { PodsModule } from "@/pods";
import { StreamsModule } from "@/streams";
import { MediaMtxModule } from "@/media-mtx";
import { TaskSequencingModule } from "@/task-sequencing";

import { SYNC_WORKFLOWS } from "./domain";
import {
    SyncService,
    SyncQueryAggregatorService,
    SyncOrchestratorService,
    StreamIngestActivationService,
    StreamIngestDiscoveryService,
    IngestStreamSynchronizerService,
    StreamReconcileService,
    StreamStalenessService,
} from "./services";

@Module({
    imports: [
        MediaMtxModule,
        StreamsModule,
        PodsModule,
        TaskSequencingModule,
    ],
    providers: [
        SyncService,
        SyncOrchestratorService,
        SyncQueryAggregatorService,
        StreamIngestDiscoveryService,
        StreamIngestActivationService,
        IngestStreamSynchronizerService,
        StreamReconcileService,
        StreamStalenessService,
        {
            provide: SYNC_WORKFLOWS,
            useFactory: (
                ingestSync: IngestStreamSynchronizerService,
                reconcile: StreamReconcileService,
                staleness: StreamStalenessService,
            ) => [ingestSync, reconcile, staleness],
            inject: [
                IngestStreamSynchronizerService,
                StreamReconcileService,
                StreamStalenessService,
            ],
        },
    ],
    exports: [SyncService],
})
export class SyncModule {}

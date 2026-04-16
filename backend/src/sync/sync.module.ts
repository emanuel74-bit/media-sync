import { Module } from "@nestjs/common";

import { PodsModule } from "../pods";
import { StreamsModule } from "../streams";
import { CommonServicesModule } from "../common";
import { SyncService } from "./services/scheduler";
import { MediaMtxModule } from "../infrastructure/media-mtx";
import { SyncQueryAggregatorService } from "./services/query";
import { SyncOrchestratorService } from "./services/orchestration";
import { SYNC_WORKFLOWS } from "./sync-workflows.token";
import {
    StreamIngestActivationService,
    StreamIngestDiscoveryService,
    IngestStreamSynchronizer,
    StreamReconcileService,
    StreamStalenessService,
} from "./services/workflows";

@Module({
    imports: [MediaMtxModule, StreamsModule, PodsModule, CommonServicesModule],
    providers: [
        SyncService,
        SyncOrchestratorService,
        SyncQueryAggregatorService,
        StreamIngestDiscoveryService,
        StreamIngestActivationService,
        IngestStreamSynchronizer,
        StreamReconcileService,
        StreamStalenessService,
        {
            provide: SYNC_WORKFLOWS,
            useFactory: (
                ingestSync: IngestStreamSynchronizer,
                reconcile: StreamReconcileService,
                staleness: StreamStalenessService,
            ) => [ingestSync, reconcile, staleness],
            inject: [IngestStreamSynchronizer, StreamReconcileService, StreamStalenessService],
        },
    ],
    exports: [SyncService],
})
export class SyncModule {}

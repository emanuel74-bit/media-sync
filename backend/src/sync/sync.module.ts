import { Module } from "@nestjs/common";

import { PodsModule } from "../pods";
import { StreamsModule } from "../streams";
import { CommonServicesModule } from "../common";
import { SyncService } from "./services/scheduler";
import { MediaMtxModule } from "../infrastructure/media-mtx";
import { SyncQueryAggregatorService } from "./services/query";
import { SyncOrchestratorService } from "./services/orchestration";
import {
    StreamIngestActivationService,
    StreamIngestDiscoveryService,
    StreamIngestSyncService,
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
        StreamIngestSyncService,
        StreamReconcileService,
        StreamStalenessService,
    ],
    exports: [SyncService],
})
export class SyncModule {}

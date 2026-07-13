import { Module } from "@nestjs/common";

import { PodsModule } from "@/pods";
import { StreamsModule } from "@/streams";
import { MediaNodesModule } from "@/media-nodes";

import {
    SyncSchedulerService,
    SyncContextBuilderService,
    SyncOrchestratorService,
    IngestStreamDiscoveryService,
    IngestStreamSynchronizerService,
    StreamReconcileService,
    StreamStalenessService,
} from "./services";

@Module({
    imports: [MediaNodesModule, StreamsModule, PodsModule],
    providers: [
        SyncSchedulerService,
        SyncOrchestratorService,
        SyncContextBuilderService,
        IngestStreamDiscoveryService,
        IngestStreamSynchronizerService,
        StreamReconcileService,
        StreamStalenessService,
    ],
})
export class SyncModule {}

import { Module } from "@nestjs/common";

import { PodsModule } from "@/pods";
import { StreamsModule } from "@/streams";
import { MediaNodesModule } from "@/media-nodes";

import { IngestActivationController } from "./controllers";
import {
    SyncSchedulerService,
    SyncContextBuilderService,
    SyncOrchestratorService,
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
        IngestStreamSynchronizerService,
        StreamReconcileService,
        StreamStalenessService,
    ],
    controllers: [IngestActivationController],
})
export class SyncModule {}

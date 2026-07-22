import { Module } from "@nestjs/common";

import { NodesModule } from "@/nodes";
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
    imports: [MediaNodesModule, StreamsModule, NodesModule],
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

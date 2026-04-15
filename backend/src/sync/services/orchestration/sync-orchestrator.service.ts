import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { SyncContext } from "../../domain";
import { SyncQueryAggregatorService } from "../query";
import {
    StreamReconcileService,
    StreamStalenessService,
    StreamIngestSyncService,
} from "../workflows";

@Injectable()
export class SyncOrchestratorService {
    private readonly logger = new Logger(SyncOrchestratorService.name);

    constructor(
        private readonly events: EventEmitter2,
        private readonly queryAggregator: SyncQueryAggregatorService,
        private readonly ingestSync: StreamIngestSyncService,
        private readonly reconcile: StreamReconcileService,
        private readonly staleness: StreamStalenessService,
    ) {}

    async execute(context: SyncContext): Promise<void> {
        if (!context.podIds.length) {
            this.logger.warn("No active cluster pods registered, skipping stream assignment");
            return;
        }

        await this.ingestSync.execute(context);

        const contextWithStreams = await this.queryAggregator.withAllStreams(context);
        await this.reconcile.execute(contextWithStreams);
        await this.staleness.execute(contextWithStreams);

        this.events.emit("sync.tick", {
            ingest: context.ingestList.length,
            cluster: context.clusterList.length,
        });
    }
}

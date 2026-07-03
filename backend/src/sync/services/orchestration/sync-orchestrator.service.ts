import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { SystemEventNames } from "@/common";

import { SyncContext } from "../../domain";
import {
    StreamReconcileService,
    StreamStalenessService,
    IngestStreamSynchronizerService,
} from "../workflows";

@Injectable()
export class SyncOrchestratorService {
    private readonly logger = new Logger(SyncOrchestratorService.name);

    constructor(
        private readonly events: EventEmitter2,
        private readonly ingestSync: IngestStreamSynchronizerService,
        private readonly reconcile: StreamReconcileService,
        private readonly staleness: StreamStalenessService,
    ) {}

    async execute(context: SyncContext): Promise<void> {
        if (!context.podIds.length) {
            this.logger.warn("No active cluster pods registered, skipping stream assignment");
            return;
        }

        const outcomes = [
            await this.runStep("IngestSync", () => this.ingestSync.execute(context)),
            await this.runStep("Reconcile", () => this.reconcile.execute(context)),
            await this.runStep("Staleness", () => this.staleness.execute(context)),
        ];
        const failures = outcomes.filter((name): name is string => name !== null);

        this.events.emit(SystemEventNames.SYNC_TICK, {
            ingest: context.ingestList.length,
            cluster: context.clusterList.length,
            failures,
        });
    }

    /** Run one step in isolation; returns its name on failure, null on success. */
    private async runStep(name: string, step: () => Promise<void>): Promise<string | null> {
        try {
            await step();
            return null;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Workflow ${name} failed: ${message}`);
            return name;
        }
    }
}

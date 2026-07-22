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
        const assignmentOutcomes = context.nodeIds.length
            ? await this.runAssignmentWorkflows(context)
            : this.skipAssignmentWorkflows();
        const outcomes = [
            ...assignmentOutcomes,
            await this.runStep("Staleness", () => this.staleness.execute(context)),
        ];
        const failures = outcomes.filter((name): name is string => name !== null);

        this.events.emit(SystemEventNames.SYNC_TICK, {
            ingest: context.ingestList.length,
            cluster: context.clusterList.length,
            failures,
        });
    }

    private async runAssignmentWorkflows(context: SyncContext): Promise<(string | null)[]> {
        return [
            await this.runStep("IngestSync", () => this.ingestSync.execute(context)),
            await this.runStep("Reconcile", () => this.reconcile.execute(context)),
        ];
    }

    private skipAssignmentWorkflows(): (string | null)[] {
        this.logger.warn("No active cluster nodes registered, skipping stream assignment");
        return [];
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

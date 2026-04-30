import { EventEmitter2 } from "@nestjs/event-emitter";
import { Inject, Injectable, Logger } from "@nestjs/common";

import { SystemEventNames } from "@/system-events";

import { SyncContext } from "../../domain/types/sync-context.types";
import { SyncWorkflow } from "../../domain/types/sync-workflow.types";
import { SYNC_WORKFLOWS } from "../../domain/consts/sync-workflows.const";

@Injectable()
export class SyncOrchestratorService {
    private readonly logger = new Logger(SyncOrchestratorService.name);

    constructor(
        private readonly events: EventEmitter2,
        @Inject(SYNC_WORKFLOWS) private readonly workflows: SyncWorkflow[],
    ) {}

    async execute(context: SyncContext): Promise<void> {
        if (!context.podIds.length) {
            this.logger.warn("No active cluster pods registered, skipping stream assignment");
            return;
        }

        const failures: string[] = [];

        for (const workflow of this.workflows) {
            try {
                await workflow.execute(context);
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                this.logger.error(`Workflow ${workflow.name} failed: ${message}`);
                failures.push(workflow.name);
            }
        }

        this.events.emit(SystemEventNames.SYNC_TICK, {
            ingest: context.ingestList.length,
            cluster: context.clusterList.length,
            failures,
        });
    }
}

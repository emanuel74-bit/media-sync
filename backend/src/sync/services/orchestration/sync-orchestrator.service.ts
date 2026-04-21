import { EventEmitter2 } from "@nestjs/event-emitter";
import { Inject, Injectable, Logger } from "@nestjs/common";

import { SYNC_WORKFLOWS } from "../../domain";
import { SyncContext, SyncWorkflow } from "../../domain";
import { SystemEventNames } from "../../../common/events";

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

        for (const workflow of this.workflows) {
            await workflow.execute(context);
        }

        this.events.emit(SystemEventNames.SYNC_TICK, {
            ingest: context.ingestList.length,
            cluster: context.clusterList.length,
        });
    }
}

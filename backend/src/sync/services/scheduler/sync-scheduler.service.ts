import { Injectable } from "@nestjs/common";

import { ScheduledTask } from "@/common";

import { SyncContextBuilderService } from "../context";
import { SyncOrchestratorService } from "../orchestration";

/**
 * Runs the full reconcile on a timer. Overlap protection (a slow cycle never races its next
 * tick) is owned by `JobScheduler`; low-latency activation of a single freshly-published stream
 * is handled separately by `IngestStreamSynchronizerService.activate` (the `runOnReady` hook).
 */
@Injectable()
export class SyncSchedulerService {
    constructor(
        private readonly contextBuilder: SyncContextBuilderService,
        private readonly orchestrator: SyncOrchestratorService,
    ) {}

    @ScheduledTask({ name: "sync.periodic", interval: (config) => config.syncPollInterval })
    async periodicSync(): Promise<void> {
        const context = await this.contextBuilder.buildContext();
        await this.orchestrator.execute(context);
    }
}

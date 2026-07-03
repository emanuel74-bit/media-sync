import { Injectable } from "@nestjs/common";

import { ScheduledTask } from "@/common";

import { SyncContextBuilderService } from "../context";
import { SyncOrchestratorService } from "../orchestration";

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

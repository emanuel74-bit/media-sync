import { Injectable } from "@nestjs/common";

import { ScheduledTask } from "@/common";

import { SyncQueryAggregatorService } from "../query";
import { SyncOrchestratorService } from "../orchestration";

@Injectable()
export class SyncService {
    constructor(
        private readonly queryAggregator: SyncQueryAggregatorService,
        private readonly orchestrator: SyncOrchestratorService,
    ) {}

    @ScheduledTask({ name: "sync.periodic", interval: (config) => config.syncPollInterval })
    async periodicSync(): Promise<void> {
        const context = await this.queryAggregator.buildContext();
        await this.orchestrator.execute(context);
    }
}

import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";

import { SequentialStreamTaskRunner } from "@/task-sequencing";

import { SyncQueryAggregatorService } from "../query";
import { SyncOrchestratorService } from "../orchestration";

@Injectable()
export class SyncService {
    private readonly logger = new Logger(SyncService.name);

    constructor(
        private readonly queryAggregator: SyncQueryAggregatorService,
        private readonly orchestrator: SyncOrchestratorService,
        private readonly scheduledWork: SequentialStreamTaskRunner,
    ) {}

    @Cron(CronExpression.EVERY_10_SECONDS)
    async periodicSync(): Promise<void> {
        await this.scheduledWork.runSafely(
            async () => {
                const context = await this.queryAggregator.buildContext();
                await this.orchestrator.execute(context);
            },
            (error) => {
                this.logger.error("Periodic sync failed", error);
            },
        );
    }
}

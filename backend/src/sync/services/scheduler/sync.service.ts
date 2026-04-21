import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";

import { ConfigService } from "../../../config";
import { SyncQueryAggregatorService } from "../query";
import { SyncOrchestratorService } from "../orchestration";
import { SequentialStreamTaskRunner } from "../../../common/services";

@Injectable()
export class SyncService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(SyncService.name);
    private syncInterval: NodeJS.Timeout | undefined;

    constructor(
        private readonly queryAggregator: SyncQueryAggregatorService,
        private readonly orchestrator: SyncOrchestratorService,
        private readonly scheduledWork: SequentialStreamTaskRunner,
        private readonly config: ConfigService,
    ) {}

    onModuleInit(): void {
        this.syncInterval = setInterval(
            () => void this.periodicSync(),
            this.config.syncPollInterval,
        );
    }

    onModuleDestroy(): void {
        clearInterval(this.syncInterval);
    }

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

import { Module } from "@nestjs/common";

import {
    AlertRuleRuntimeService,
    RuleEvaluationCoordinatorService,
    ScheduledWorkCoordinatorService,
} from "./services";

@Module({
    providers: [
        AlertRuleRuntimeService,
        RuleEvaluationCoordinatorService,
        ScheduledWorkCoordinatorService,
    ],
    exports: [
        AlertRuleRuntimeService,
        RuleEvaluationCoordinatorService,
        ScheduledWorkCoordinatorService,
    ],
})
export class CommonServicesModule {}

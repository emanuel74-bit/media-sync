import { Module } from "@nestjs/common";

import { AlertRuleEvaluator } from "./services/alert-rule-evaluator.service";
import { SequentialStreamTaskRunner } from "./services/sequential-stream-task-runner.service";

@Module({
    providers: [AlertRuleEvaluator, SequentialStreamTaskRunner],
    exports: [AlertRuleEvaluator, SequentialStreamTaskRunner],
})
export class CommonServicesModule {}

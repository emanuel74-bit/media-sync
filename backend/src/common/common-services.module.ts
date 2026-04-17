import { Module } from "@nestjs/common";

import { AlertRuleEvaluator, SequentialStreamTaskRunner } from "./services";

@Module({
    providers: [AlertRuleEvaluator, SequentialStreamTaskRunner],
    exports: [AlertRuleEvaluator, SequentialStreamTaskRunner],
})
export class CommonServicesModule {}

import { Module } from "@nestjs/common";

import { RuleEvaluator, SequentialStreamTaskRunner } from "./services";

@Module({
    providers: [RuleEvaluator, SequentialStreamTaskRunner],
    exports: [RuleEvaluator, SequentialStreamTaskRunner],
})
export class CommonModule {}

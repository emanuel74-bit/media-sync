import { Injectable } from "@nestjs/common";

import { AlertCreateRequestedPayload } from "../events";
import { RuntimeAlertRule, AlertRuleRuntimeService } from "./alert-rule-runtime.service";

@Injectable()
export class RuleEvaluationCoordinatorService {
    constructor(private readonly runtime: AlertRuleRuntimeService) {}

    async evaluateAndEmit<TInput, TContext>(
        streamName: string,
        input: TInput,
        context: TContext,
        rules: readonly RuntimeAlertRule<TInput, TContext>[],
    ): Promise<AlertCreateRequestedPayload[]> {
        return this.runtime.evaluateAndEmit(streamName, input, context, rules);
    }
}

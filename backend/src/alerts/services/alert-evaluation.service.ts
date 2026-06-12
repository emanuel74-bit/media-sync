import { Injectable } from "@nestjs/common";

import { RuleEvaluator, RuntimeAlertRule } from "@/common";

import { AlertLifecycleService } from "./alert-lifecycle.service";

@Injectable()
export class AlertEvaluationService {
    constructor(
        private readonly ruleEvaluator: RuleEvaluator,
        private readonly alertLifecycle: AlertLifecycleService,
    ) {}

    async evaluateAndCreate<TInput, TContext>(
        streamName: string,
        input: TInput,
        context: TContext,
        rules: readonly RuntimeAlertRule<TInput, TContext>[],
    ): Promise<void> {
        const payloads = await this.ruleEvaluator.evaluate(streamName, input, context, rules);

        for (const payload of payloads) {
            await this.alertLifecycle.findOrCreateAlert(payload);
        }
    }
}

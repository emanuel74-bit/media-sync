import { Injectable } from "@nestjs/common";

import { AlertSignal, RuntimeAlertRule } from "../domain";

@Injectable()
export class RuleEvaluator {
    evaluate<TInput, TContext>(
        subject: string,
        input: TInput,
        context: TContext,
        rules: readonly RuntimeAlertRule<TInput, TContext>[],
    ): AlertSignal[] {
        const signals: AlertSignal[] = [];

        for (const rule of rules) {
            if (!rule.check(input, context)) {
                continue;
            }
            signals.push({
                subject,
                type: rule.type,
                severity: rule.severity,
                message: rule.message(input),
            });
        }

        return signals;
    }
}

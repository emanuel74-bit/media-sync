import { Injectable } from "@nestjs/common";

import { AlertSignal, RuntimeAlertRule } from "@/common";

/**
 * Shared evaluation engine for the alert rulers: maps any rule list + input to the
 * `AlertSignal[]` that should exist. Generic across the alert sources (metric/track/node),
 * not across features — its output is an alerts concept, so it lives with the rulers.
 */
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

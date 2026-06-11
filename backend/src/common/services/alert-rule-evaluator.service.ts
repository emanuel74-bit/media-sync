import { Injectable } from "@nestjs/common";

import { AlertSeverity, AlertType, RuntimeAlertRule } from "../domain";

export interface EvaluatedAlert {
    streamName: string;
    type: AlertType;
    severity: AlertSeverity;
    message: string;
}

@Injectable()
export class RuleEvaluator {
    async evaluate<TInput, TContext>(
        streamName: string,
        input: TInput,
        context: TContext,
        rules: readonly RuntimeAlertRule<TInput, TContext>[],
    ): Promise<EvaluatedAlert[]> {
        const payloads: EvaluatedAlert[] = [];

        for (const rule of rules) {
            if (!rule.check(input, context)) {
                continue;
            }

            const payload: EvaluatedAlert = {
                streamName,
                type: rule.type,
                severity: rule.severity,
                message: rule.message(input),
            };

            payloads.push(payload);
        }

        return payloads;
    }
}

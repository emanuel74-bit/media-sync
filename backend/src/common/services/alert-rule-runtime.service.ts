import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { AlertSeverity, AlertType } from "../types";
import { AlertCreateRequestedPayload } from "../events";

export type RuntimeAlertRule<TInput, TContext> = {
    check: (input: TInput, context: TContext) => boolean;
    type: AlertType;
    severity: AlertSeverity;
    message: (input: TInput) => string;
};

@Injectable()
export class AlertRuleRuntimeService {
    constructor(private readonly events: EventEmitter2) {}

    async evaluateAndEmit<TInput, TContext>(
        streamName: string,
        input: TInput,
        context: TContext,
        rules: readonly RuntimeAlertRule<TInput, TContext>[],
    ): Promise<AlertCreateRequestedPayload[]> {
        const payloads: AlertCreateRequestedPayload[] = [];

        for (const rule of rules) {
            if (!rule.check(input, context)) {
                continue;
            }

            const payload: AlertCreateRequestedPayload = {
                streamName,
                type: rule.type,
                severity: rule.severity,
                message: rule.message(input),
            };

            payloads.push(payload);
            this.events.emit("alert.create", payload);
        }

        return payloads;
    }
}

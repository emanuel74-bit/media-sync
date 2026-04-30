import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { AlertCreateRequestedPayload, SystemEventNames } from "@/system-events";

import { RuntimeAlertRule } from "../domain/types/runtime-alert-rule.types";

@Injectable()
export class AlertRuleExecutionService {
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
            this.events.emit(SystemEventNames.ALERT_CREATE, payload);
        }

        return payloads;
    }
}